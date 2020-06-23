//
// Created by Takuo Doi on 2019-01-24.
//
#include <string>
#include <iostream>
#include <fstream>
#include <limits>
#include <zlib.h>

#include "Sequence.h"

#ifndef CLUSTER_SEQUENCES_FASTQREADER_H
#define CLUSTER_SEQUENCES_FASTQREADER_H

class FastqReader {
private:
    std::ifstream fin_;
    gzFile fingz_;
public:
    FastqReader(const std::string& fastq){
        if(fastq.size()-3 == fastq.rfind(".gz")){
            fingz_ = gzopen(fastq.c_str(), "rb");
            if(fingz_ == NULL){
                std::cerr << "Failed to open gz file " << fastq << std::endl;
            }
        }else{
            fin_ = std::ifstream(fastq);
            if (fin_.fail()) {
                std::cerr << "Failed to open file " << fastq << std::endl;
            }
        }
    }

    ~FastqReader() {
        if(fingz_ == NULL){
            fin_.close();
        }else{
            gzclose(fingz_);
        }
    }
    
    std::string chompLine(char* buf){
        std::string ret = std::string(buf);
        if(ret.size() == 0){
            return ret;
        }
        size_t cc = ret.size();
        size_t subsiz = ret.size();
        
        if(ret[cc-1] == '\n' || ret[cc-1] == '\r'){
            subsiz = cc-1;
        }
        if(ret.size() == 1){
            return ret.substr(0,subsiz);
        }
        if(ret[cc-2] == '\r' && ret[cc-1] == '\n'){
            subsiz = cc-2;
        }
        return ret.substr(0,subsiz);
    }
    
    bool fetch(Sequence& sequence) {
        if(fingz_ == NULL){
            if (!readName(sequence)) {
                return false;
            }
            if (!std::getline(fin_, sequence.seq)) {
                return false;
            }
            std::string separator;
            if (!std::getline(fin_, separator)) {
                return false;
            }
            readQuality(sequence);

            return sequence.quality.size() == sequence.seq.size();
        }else{
            if (!readName(sequence)) {
                return false;
            }
            char buf[2096] = {0};
            if(gzgets(fingz_, buf, sizeof(buf)) != Z_NULL){
                sequence.seq = chompLine(buf);
            }else{
                return false;
            }
            std::string separator;
            if(gzgets(fingz_, buf, sizeof(buf)) != Z_NULL){
                //separator = std::string(buf);
            }else{
                return false;
            }
            readQuality(sequence);
            return sequence.quality.size() == sequence.seq.size();
        }
    }

    bool readName(Sequence& sequence) {
        if(fingz_ == NULL){
            std::string header;
            if (!std::getline(fin_, header)) {
                return false;
            }
            if (header[0] != '@') {
                return false;
            }
            sequence.name = header.substr(1);
            return true;
        }else{
            char buf[2096] = {0};
            if(gzgets(fingz_, buf, sizeof(buf)) != Z_NULL){
                if(buf[0] != '@'){
                    return false;
                }
                sequence.name = chompLine(buf).substr(1);
                return true;
            }else{
                return false;
            }
        }
    }

    bool readQuality(Sequence& sequence) {
        std::string quality;
        if(fingz_ == NULL){
            if (!std::getline(fin_, quality)) {
                return false;
            }
        }else{
            char buf[2096] = {0};
            if(gzgets(fingz_, buf, sizeof(buf)) != Z_NULL){
                quality = chompLine(buf);
            }else{
                return false;
            }
        }
        sequence.quality.clear();
        sequence.min_quality = std::numeric_limits<int>::max();
        sequence.max_quality = std::numeric_limits<int>::min();
        double total = 0;
        for (size_t i = 0; i < quality.size(); ++i) {
            int v = quality[i] - 33;
            total += v;
            if (v < sequence.min_quality) {
                sequence.min_quality = v;
            }
            if (sequence.max_quality < v) {
                sequence.max_quality = v;
            }
            sequence.quality.push_back(v);
        }
        sequence.avg_quality = static_cast<int>(total / quality.size());
        return true;
    }
};

#endif //CLUSTER_SEQUENCES_SEQUENCEREADER_H
