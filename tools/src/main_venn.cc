#include <string>
#include <vector>
#include <set>
#include <cstddef>
#include <getopt.h>

#include "venn.h"

struct option longopts[] = {
        {"command", required_argument, 0, 'c'},
        {"include", required_argument, 0, 'i'},
        {"exclude", required_argument, 0, 'e'},
};

int main(int argc, char** argv)
{
    int opt;
    int longindex;

    std::string command;
    std::vector<std::string> includes;
    std::vector<std::string> excludes;

    while ((opt = getopt_long(argc, argv, "m:i:e:", longopts, &longindex)) != -1) {
        switch (opt) {
            case 'c':
                command = optarg;
                break;
            case 'i':
                includes.push_back(optarg);
                break;
            case 'e':
                excludes.push_back(optarg);
                break;
            default:
                break;
        }
    }

    std::vector< std::set<std::string> > includeSequences;
    seq::loadSequences(includes, includeSequences);

    std::vector< std::set<std::string> > excludeSequences;
    seq::loadSequences(excludes, excludeSequences);

    if (command == "summary") {
        seq::showSummary(includeSequences);
    } else if (command == "csv" || command == "fasta") {
        std::set<std::string> result;
        seq::calculateAllIntersections(includeSequences, excludeSequences, result);

        if (command == "csv") {
            seq::outputAsCsv(result);
        } else if (command == "fasta") {
            seq::outputAsFasta(result);
        }
    }

    return 0;
}