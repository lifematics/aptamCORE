#include <unistd.h>
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <cstring>
#include <algorithm>
#include "filter.h"

#include "FastqReader.h"

namespace seq {

    struct CompareSequence : public std::unary_function<SequenceInfo, bool> {
    private:
        const Sequence& sequence;
    public:
        CompareSequence(const Sequence& seq) : sequence(seq) {}
        bool operator()(const SequenceInfo& info) const {
            const Sequence& seq = info.getSequence();
            return seq.head == sequence.head && seq.variable == sequence.variable && seq.tail == sequence.tail;
        }
    };

    void VariableSequence::append(const Sequence &sequence) {
        ++count_;
        if (name_.size() == 0 || sequence.name < name_) {
            name_ = sequence.name;
        }

        SequenceVariations::iterator itr = std::find_if(variations_.begin(), variations_.end(), CompareSequence(sequence));

        if (itr == variations_.end()) {
            variations_.push_back(SequenceInfo(sequence.name, sequence, 1));
        } else {
            (*itr).addCount();
            if (sequence.name < (*itr).getName()) {
                (*itr).setName(sequence.name);
            }
        }
    }

    void SequenceSummary::append(const Sequence &sequence) {
        std::string fullSequecne = sequence.head + "/" + sequence.variable + "/" + sequence.tail;
        SequenceSummaryMap::iterator itr = map.find(sequence.variable);
        if (itr == map.end()) {
            VariableSequence variableSequence(sequence.variable);
            variableSequence.append(sequence);
            map.insert(std::make_pair(sequence.variable, variableSequence));
        } else {
            (*itr).second.append(sequence);
        }
    }

    SequenceFilter::SequenceFilter(size_t minLength, size_t maxLength,
            const std::string &head, size_t head_error, const std::string &tail, size_t tail_error,
            int quality, int criteria)
            : minLength_(minLength), maxLength_(maxLength),
            head_(head), head_error_(head_error), tail_(tail), tail_error_(tail_error),
            quality_(quality), criteria_(criteria), accepted_(0), rejected_(0),
            alignmenter(1, -1, -1)
            {
    }

    bool SequenceFilter::process(Sequence &sequence) {
        if (execute(sequence)) {
            ++accepted_;
            return true;
        } else {
            ++rejected_;
            return false;
        }
    }

    void SequenceFilter::showResult(std::ostream &stream) {
        stream << "{";
        stream << "\"total\":" << (accepted_ + rejected_) << ", ";
        stream << "\"accepted\": " << accepted_ << ", ";
        stream << "\"rejected\": " << rejected_;
        stream << "}";
    }

    bool SequenceFilter::isQualitySatisfied(const std::vector<int> &qualityList) const {
        int count = 0;
        std::vector<int>::const_iterator itr = qualityList.begin();
        for (; itr != qualityList.end(); ++itr) {
            if ((*itr) < quality_) {
                ++count;
            }
        }

        return count < criteria_;
    }

    size_t SequenceFilter::findMotif(const std::string& motif, const std::string& sequence, std::string& matched) const
    {
        return alignmenter.findMotif(motif, sequence, matched);
    }

    bool SequenceFilter::findPrimerForward(const std::string &sequence, const std::string &motif, std::string &primer) const {
        std::string target;
        target.assign(sequence, 0, motif.size() + 2 * head_error_);
        size_t distance = findMotif(motif, target, primer);

        return distance <= head_error_;
    }

    bool SequenceFilter::findPrimerBackward(const std::string &sequence, const std::string &motif, std::string &primer) const {
        std::string target;
        size_t begin = (sequence.size() < (motif.size() + 2 * tail_error_)) ? 0 : (sequence.size() - (motif.size() + 2 * tail_error_));
        target.assign(sequence, begin, motif.size() + 2 * tail_error_);

        std::string seq(target);
        std::reverse(seq.begin(), seq.end());
        std::string mot(motif);
        std::reverse(mot.begin(), mot.end());

        size_t distance = findMotif(mot, seq, primer);
        std::reverse(primer.begin(), primer.end());

        return distance <= tail_error_;
    }

    bool SequenceFilter::execute(Sequence &sequence) const {
        if (!isQualitySatisfied(sequence.quality)) {
            return false;
        }

        const std::string &seq = sequence.seq;
        if (!findPrimerForward(seq, head_, sequence.head)) {
            return false;
        }
        if (!findPrimerBackward(seq, tail_, sequence.tail)) {
            return false;
        }
        sequence.variable.assign(seq, sequence.head.size(), seq.size() - sequence.head.size() - sequence.tail.size());

        if ((minLength_ > 0) && sequence.variable.size() < minLength_) {
            return false;
        }
        if ((maxLength_ > 0) && sequence.variable.size() > maxLength_) {
            return false;
        }

        return true;
    }
    
    void applyFilter(FastqReader &reader, SequenceFilter &filter, std::ostream &ov, std::ostream &of) {
        std::map<std::string, SequenceInfo> variables;
        std::map<std::string, SequenceInfo> fulls;

        SequenceSummary summary;
        Sequence sequence;
        while (reader.fetch(sequence)) {
            if (!filter.process(sequence)) {
                continue;
            }

            summary.append(sequence);
        }

        int index = 1;
        for (SequenceSummary::iterator itr = summary.begin(); itr != summary.end(); ++itr) {
            VariableSequence& variableSequence = (*itr).second;
            ov << ">" << index << ":" << variableSequence.getCount()
               << ":" << variableSequence.getName()
               << std::endl;
            ov << variableSequence.getSequence() << std::endl;

            int variationIndex = 1;
            const SequenceVariations& variations = variableSequence.getVariations();
            for (SequenceVariations::const_iterator variationItr = variations.begin(); variationItr != variations.end(); ++variationItr) {
                of << ">" << index << ":" << variationIndex << ":" << (*variationItr).getCount()
                   << ":" << (*variationItr).getName()
                   << std::endl;
                const Sequence& seq = (*variationItr).getSequence();
                of << seq.head << std::endl;
                of << seq.variable << std::endl;
                of << seq.tail << std::endl;
                ++variationIndex;
            }
            ++index;
        }
    }

}
