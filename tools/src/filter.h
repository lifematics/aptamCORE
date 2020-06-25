#ifndef SEQ_TRACER_TOOLS_FILTER
#define SEQ_TRACER_TOOLS_FILTER

#include <string>
#include <vector>
#include <map>

#include "FastqReader.h"
#include "NeedlemanWunsch.h"

namespace seq {

    class SequenceInfo {
    private:
        std::string name_;
        Sequence sequence_;
        int count_;

    public:
        SequenceInfo() : name_(""), count_(0) {}
        SequenceInfo(const std::string& name, const Sequence& sequence, int count) : name_(name), sequence_(sequence), count_(count) {}

        const std::string& getName() const { return name_; }
        void setName(const std::string& name) { name_ = name; }

        const Sequence& getSequence() const { return sequence_; }

        void addCount() { ++count_; }
        int getCount() const { return count_; }
    };

    class VariableSequenceIterator;


    typedef std::vector<SequenceInfo> SequenceVariations;

    class VariableSequence {

    private:
        std::string name_;
        std::string sequence_;
        unsigned long count_;
        SequenceVariations variations_;

    public:
        VariableSequence(const std::string& sequence) : name_(""), sequence_(sequence), count_(0) {}

        void append(const Sequence& sequence);

        const std::string& getName() const { return name_; }
        const std::string& getSequence() const { return sequence_; }
        unsigned long getCount() const { return count_; }
        SequenceVariations getVariations() const { return variations_; }
    };

    typedef std::map<std::string, VariableSequence> SequenceSummaryMap;

    class SequenceSummary {
    private:
        SequenceSummaryMap map;

    public:
        void append(const Sequence& sequence);

        typedef SequenceSummaryMap::iterator iterator;

        iterator begin() { return map.begin(); }
        iterator end() { return map.end(); }
    };

    class SequenceFilter {
    private:
        const size_t minLength_;
        const size_t maxLength_;
        const std::string &head_;
        const size_t head_error_;
        const std::string &tail_;
        const size_t tail_error_;
        const int quality_;
        const int criteria_;

        int accepted_;
        int rejected_;

        const NeedlemanWunsch alignmenter;

    public:
        SequenceFilter(size_t minLength, size_t maxLength, const std::string &head, size_t head_error, const std::string &tail, size_t tail_error, int quality, int criteria);

        bool process(Sequence &sequence);

        void showResult(std::ostream &stream);

    private:

        bool isQualitySatisfied(const std::vector<int> &qualityList) const;

        size_t findMotif(const std::string& motif, const std::string& sequence, std::string& matched) const;

        bool findPrimerForward(const std::string &sequence, const std::string &motif, std::string &primer) const;

        bool findPrimerBackward(const std::string &sequence, const std::string &motif, std::string &primer) const;

        bool execute(Sequence &sequence) const;
    };

//    void appendSequence(std::map<std::string, SequenceInfo> &map, const std::string& name, const std::string &sequence);

    void applyFilter(FastqReader &reader, SequenceFilter &filter, std::ostream &ov, std::ostream &of);

}

#endif //  SEQ_TRACER_TOOLS_FILTER
