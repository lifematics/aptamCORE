//
// Created by Takuo Doi on 2019-01-24.
//
#include <string>
#include <vector>

#ifndef PROJECT_SEQUENCE_H
#define PROJECT_SEQUENCE_H

struct Sequence {
    std::string name;
    std::string seq;

    std::string head;
    std::string variable;
    std::string tail;

    std::vector<int> quality;
    int max_quality;
    int min_quality;
    int avg_quality;
};

#endif //PROJECT_SEQUENCE_H
