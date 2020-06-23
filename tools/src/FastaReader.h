//
// Created by Takuo Doi on 2019-01-24.
//
#include <string>
#include <iostream>
#include <fstream>

#include "Sequence.h"

#ifndef CLUSTER_SEQUENCES_FASTAREADER_H
#define CLUSTER_SEQUENCES_FASTAREADER_H

class FastaReader {
private:
    std::ifstream fin_;

public:
    FastaReader(const std::string& fastq) : fin_(fastq) {
        if (fin_.fail()) {
            std::cerr << "Failed to open file " << fastq << std::endl;
        }
    }
    ~FastaReader() {
        fin_.close();
    }

    bool fetch(Sequence& sequence) {
        if (!readName(sequence)) {
            return false;
        }

        if (!std::getline(fin_, sequence.seq)) {
            return false;
        }

        return true;
    }

    bool readName(Sequence& sequence) {
        std::string header;
        if (!std::getline(fin_, header)) {
            return false;
        }
        if (header[0] != '>') {
            return false;
        }
        sequence.name = header.substr(2);

        return true;
    }

};

#endif //CLUSTER_SEQUENCES_FASTAREADER_H
