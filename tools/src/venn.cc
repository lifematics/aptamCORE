#include <unistd.h>
#include <getopt.h>
#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <sstream>
#include <cmath>
#include <algorithm>

#include "venn.h"
#include "FastaReader.h"

namespace seq {

    void calcCombinations(int n, std::vector<std::set<int> > &combinations) {
        int max = static_cast<int>(pow(2, n));
        for (int i = 1; i < max; i++) {
            std::set<int> set;
            for (int j = 0; j < n; j++) {
                if ((i & (1 << j)) != 0) {
                    set.insert(j);
                }
            }
            combinations.push_back(set);
        }
    }

    void calcIntersections(const std::set<int> indexList, const std::vector<std::set<std::string> > &sequences, std::set<std::string> &result) {
        std::set<int>::const_iterator indexItr = indexList.begin();

        const std::set<std::string> &first = sequences[static_cast<size_t>(*indexItr)];
        std::copy(first.begin(), first.end(), std::inserter(result, result.end()));

        ++indexItr;
        for (; indexItr != indexList.end(); ++indexItr) {
            const std::set<std::string> &target = sequences[static_cast<size_t>(*indexItr)];
            std::set<std::string> tmp;
            std::set_intersection(result.begin(), result.end(), target.begin(), target.end(), std::inserter(tmp, tmp.end()));
            result.clear();
            std::copy(tmp.begin(), tmp.end(), std::inserter(result, result.end()));
        }
    }

    void calcExclusion(const std::set<std::string> &source,
                       const std::set<int> indexList, const std::vector<std::set<std::string> > &sequences,
                       std::set<std::string> &result) {
        result = source;

        std::set<int>::const_iterator indexItr = indexList.begin();
        for (; indexItr != indexList.end(); ++indexItr) {
            std::set<std::string> tmp = result;
            const std::set<std::string> &target = sequences[static_cast<size_t>(*indexItr)];
            result.clear();
            std::set_difference(tmp.begin(), tmp.end(), target.begin(), target.end(), std::inserter(result, result.end()));
        }
    }

    void calculateSummary(const std::vector<std::set<std::string> > &sequences, std::map<std::set<int>, int> &results) {
        std::vector<std::set<int> > combinations;
        calcCombinations(static_cast<int>(sequences.size()), combinations);

        for (std::vector<std::set<int> >::iterator itr = combinations.begin(); itr != combinations.end(); ++itr) {
            std::set<std::string> result;
            calcIntersections((*itr), sequences, result);
            results.insert(std::make_pair((*itr), result.size()));
        }
    }

    void loadSequences(const std::vector<std::string> &files, std::vector<std::set<std::string> > &sequences) {
        for (std::vector<std::string>::const_iterator itr = files.begin(); itr != files.end(); ++itr) {
            FastaReader reader((*itr));

            Sequence sequence;
            std::set<std::string> set;
            while (reader.fetch(sequence)) {
                set.insert(sequence.seq);
            }

            sequences.push_back(set);
        }
    }

    void showSummary(const std::vector<std::set<std::string> > &sequences) {
        std::map<std::set<int>, int> results;
        calculateSummary(sequences, results);

        std::map<std::set<int>, int>::iterator itr = results.begin();
        std::cout << "[" << std::endl;
        for (; itr != results.end(); ++itr) {
            std::cout << "{" << std::endl;
            std::cout << "\"sets\":";
            dumpSet((*itr).first);
            std::cout << ",";
            std::cout << " \"size\": " << (*itr).second;
            std::cout << "}," << std::endl;
        }
        std::cout << "]" << std::endl;
    }

    void calculateAllIntersections(const std::vector<std::set<std::string> > &includes,
                                   const std::vector<std::set<std::string> > &excludes,
                                   std::set<std::string> &result) {
        std::set<int> includeIndexList;
        for (int i = 0; i < static_cast<int>(includes.size()); ++i) {
            includeIndexList.insert(i);
        }
        std::set<std::string> merged;
        calcIntersections(includeIndexList, includes, merged);

        std::set<int> excludeIndexList;
        for (int i = 0; i < static_cast<int>(excludes.size()); ++i) {
            excludeIndexList.insert(i);
        }
        calcExclusion(merged, excludeIndexList, excludes, result);
    }

    void outputAsCsv(const std::set<std::string> &sequences) {
        for (std::set<std::string>::const_iterator itr = sequences.begin(); itr != sequences.end(); ++itr) {
            std::cout << (*itr) << std::endl;
        }
    }

    void outputAsFasta(const std::set<std::string> &sequences) {
        int index = 1;
        for (std::set<std::string>::const_iterator itr = sequences.begin(); itr != sequences.end(); ++itr) {
            std::cout << ">lcl|" << index << std::endl;
            std::cout << (*itr) << std::endl;
            ++index;
        }
    }

}