//
// Created by Takuo Doi on 2019-05-31.
//

#include "NeedlemanWunsch.h"

/*
 Petar 'PetarV' Velickovic
 Algorithm: Needleman-Wunsch
*/

#include <stdio.h>
#include <math.h>
#include <string.h>
#include <time.h>
#include <iostream>
#include <vector>
#include <list>
#include <string>
#include <algorithm>
#include <queue>
#include <stack>
#include <set>
#include <map>
#include <complex>

#define _DEBUG false

NeedlemanWunsch::NeedlemanWunsch(int match_score_, int mismatch_score_, int gap_score_)
: match_score(match_score_), mismatch_score(mismatch_score_), gap_score(gap_score_)
{
}

size_t NeedlemanWunsch::findMotif(const std::string& motif, const std::string& sequence, std::string& matched) const
{
    std::pair<std::string, std::string> alignment;
    align(motif, sequence, alignment);

    size_t distance = 0;

    std::stringstream stream;

    size_t i = 0;
    size_t numChar = 0;
    while (numChar < motif.size()) {
        if (alignment.second[i] != '-') {
            stream << alignment.second[i];
        }
        if (alignment.first[i] == alignment.second[i]) {
            ++i;
            ++numChar;
        } else if (alignment.first[i] == '-') {
            ++distance;
            ++i;
        } else {
            ++distance;
            ++i;
            ++numChar;
        }
    }

    matched.assign(stream.str());

    return distance;
}

size_t NeedlemanWunsch::compare(const std::string& str1, const std::string& str2) const
{
    std::string matched;
    return findMotif(str1, str2, matched);
}

int NeedlemanWunsch::align(const std::string& str1, const std::string& str2, std::pair<std::string, std::string>& alignment) const
{
    size_t n = str1.size();
    size_t m = str2.size();

    for (size_t i = 0; i <= n; ++i) {
        dp[i][0] = static_cast<int>(i) * gap_score;
    }
    
	for (size_t i = 0; i <= m; ++i) {
        dp[0][i] = static_cast<int>(i) * gap_score;
    }
    
	
    for (size_t i = 1; i <= n; ++i) {
        for (size_t j = 1; j <= m; ++j) {
            int score = (str1[i-1] == str2[j-1]) ? match_score : mismatch_score;
            dp[i][j] = std::max(dp[i-1][j-1] + score, std::max(dp[i-1][j] + gap_score, dp[i][j-1] + gap_score));
        }
    }

#if _DEBUG
    printf("%s %s\n", str1.c_str(), str2.c_str());
    for (size_t i = 0; i <= n; ++i) {
        for (size_t j = 0; j <= m; ++j) {
            printf("%02d ", dp[i][j]);
        }
        printf("\n");
    }
#endif // _DEBUG

    alignment = getAlignment(str1, str2);
    return dp[n][m];
}

std::pair<std::string, std::string> NeedlemanWunsch::getAlignment(const std::string &str1, const std::string &str2) const
{
    std::string retA, retB;
    std::stack<char> SA, SB;
    size_t i = str1.size();
    size_t j = str2.size();

    while (i != 0 || j != 0) {
        if (i == 0) {
            SA.push('-');
            SB.push(str2[j-1]);
            --j;
        } else if (j == 0) {
            SA.push(str1[i - 1]);
            SB.push('-');
            --i;
        } else {
            if (dp[i][j - 1] + gap_score == dp[i][j]) {
                SA.push('-');
                SB.push(str2[j - 1]);
                --j;
            } else {
                int score = (str1[i - 1] == str2[j - 1]) ? match_score : mismatch_score;
                if (dp[i - 1][j - 1] + score == dp[i][j]) {
                    SA.push(str1[i - 1]);
                    SB.push(str2[j - 1]);
                    --i;
                    --j;
                } else {
                    SA.push(str1[i - 1]);
                    SB.push('-');
                    --i;
                }
            }
        }
    }

    while (!SA.empty())
    {
        retA += SA.top();
        retB += SB.top();
        SA.pop();
        SB.pop();
    }
    return make_pair(retA, retB);
}
