#ifndef SEQ_TRACER_TOOLS_VENN
#define SEQ_TRACER_TOOLS_VENN

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

#include "FastaReader.h"

namespace seq {

    template<typename T>
    void dumpSet(const std::set<T> &set) {
        std::cout << "[" << std::endl;
        typename std::set<T>::const_iterator itr = set.begin();
        std::cout << (*itr);
        ++itr;
        for (; itr != set.end(); ++itr) {
            std::cout << ", " << (*itr);
        }
        std::cout << "]" << std::endl;
    }

    void calcCombinations(int n, std::vector<std::set<int> > &combinations);

    void calcIntersections(const std::set<int> indexList, const std::vector<std::set<std::string> > &sequences, std::set<std::string> &result);

    void calcExclusion(const std::set<std::string> &source, const std::set<int> indexList, const std::vector<std::set<std::string> > &sequences, std::set<std::string> &result);

    void calculateSummary(const std::vector<std::set<std::string> > &sequences, std::map<std::set<int>, int> &results);

    void loadSequences(const std::vector<std::string> &files, std::vector<std::set<std::string> > &sequences);

    void showSummary(const std::vector<std::set<std::string> > &sequences);

    void calculateAllIntersections(const std::vector<std::set<std::string> > &includes,
                                   const std::vector<std::set<std::string> > &excludes,
                                   std::set<std::string> &result);

    void outputAsCsv(const std::set<std::string> &sequences);

    void outputAsFasta(const std::set<std::string> &sequences);
}

#endif // SEQ_TRACER_TOOLS_VENN