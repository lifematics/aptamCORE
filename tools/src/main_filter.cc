#include <string>
#include <getopt.h>

#include "filter.h"

struct option longopts[] = {
        {"quality",    required_argument, NULL, 'q'},
        {"criteria",   required_argument, NULL, 'c'},
        {"head",       required_argument, NULL, 'h'},
        {"herror",     required_argument, NULL, 'H'},
        {"tail",       required_argument, NULL, 't'},
        {"terror",     required_argument, NULL, 'T'},
        {"input",      required_argument, NULL, 'i'},
        {"variable",   required_argument, NULL, 'v'},
        {"full",       required_argument, NULL, 'f'},
        {"result",     required_argument, NULL, 'r'},
        {"min-length", required_argument, NULL, 'm'},
        {"max-length", required_argument, NULL, 'M'},
        {0, 0, 0,                               0},
};

int main(int argc, char **argv) {
    int quality = 0;
    int criteria = 0;
    std::string head = "";
    size_t head_error = 0;
    std::string tail = "";
    size_t tail_error = 0;
    std::string input;
    std::string variable;
    std::string full;
    std::string result;
    size_t minLength = 0;
    size_t maxLength = 0;;

    int opt;
    int longindex;
    while ((opt = getopt_long(argc, argv, "q:c:h:H:t:T:i:v:f:r:m:M:", longopts, &longindex)) != -1) {
        switch (opt) {
            case 'q':
                quality = atoi(optarg);
                break;
            case 'c':
                criteria = atoi(optarg);
                break;
            case 'h':
                head.assign(optarg);
                break;
            case 'H':
                head_error = static_cast<size_t>(atoi(optarg));
                break;
            case 't':
                tail.assign(optarg);
                break;
            case 'T':
                tail_error = static_cast<size_t>(atoi(optarg));
                break;
            case 'i':
                input.assign(optarg);
                break;
            case 'v':
                variable.assign(optarg);
                break;
            case 'f':
                full.assign(optarg);
                break;
            case 'r':
                result.assign(optarg);
                break;
            case 'm':
                minLength = static_cast<size_t>(atoi(optarg));
                break;
            case 'M':
                maxLength = static_cast<size_t>(atoi(optarg));
                break;
            default:
                break;
        }
    }

    if (input.size() == 0 || variable.size() == 0 || full.size() == 0) {
        return -1;
    }

    FastqReader reader(input);
    seq::SequenceFilter filter(minLength, maxLength, head, head_error, tail, tail_error, quality, criteria);
    std::ofstream ov(variable);
    std::ofstream of(full);
    applyFilter(reader, filter, ov, of);
    ov.close();
    of.close();

    if (result.size() != 0) {
        std::ofstream fout(result);
        filter.showResult(fout);
        fout.close();
    } else {
        filter.showResult(std::cout);
    }
}
