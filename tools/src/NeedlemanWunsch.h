//
// Created by Takuo Doi on 2019-05-31.
//

#ifndef PROJECT_NEEDLEMANWUNSCH_H
#define PROJECT_NEEDLEMANWUNSCH_H

#define DPRINTC(C) printf(#C " = %c\n", (C))
#define DPRINTS(S) printf(#S " = %s\n", (S))
#define DPRINTD(D) printf(#D " = %d\n", (D))
#define DPRINTLLD(LLD) printf(#LLD " = %lld\n", (LLD))
#define DPRINTLF(LF) printf(#LF " = %.5lf\n", (LF))

#include <string>
#include <map>
#include <set>

class NeedlemanWunsch {

    static const int MAX_SIZE = 128;

private:
    const int match_score;
    const int mismatch_score;
    const int gap_score;

    mutable int dp[MAX_SIZE][MAX_SIZE];

public:
    NeedlemanWunsch(int match_score_, int mismatch_score_, int gap_score_);

    size_t findMotif(const std::string& motif, const std::string& sequence, std::string& matched) const;

    size_t compare(const std::string& str1, const std::string& str2) const;

    int align(const std::string& str1, const std::string& str2, std::pair<std::string, std::string>& alignment) const;

private:
    std::pair<std::string, std::string> getAlignment(const std::string &str1, const std::string &str2) const;

};


#endif //PROJECT_NEEDLEMANWUNSCH_H
