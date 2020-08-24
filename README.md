# aptamCORE
GUI application for aptamer enrichment analysis  

## Project setup
```
git clone https://github.com/lifematics/aptamCORE.git
cd aptamCORE
npm install
# Please change permissions or create binaries if you are using linux system.
# Binaries in "tools" directory are compiled with Ubuntu 18.04.3 LTS (GNU/Linux 4.15.0-72-generic x86_64).
# chmod 755 tools/venn  tools/flash2  tools/cd-hit-est tools/filter_gz
```

### Create linux binaries of tools
Please follow the instructions of each binary for 
[FLASH2](https://github.com/dstreett/FLASH2)  and 
[CD-HIT-EST](https://github.com/weizhongli/cdhit)  .
The source codes of filter_gz and venn are in tools/src and can be compiled with cmake command.
```
cd tools/src
cmake CMakeLists.txt
make
cp venn ../
cp filter_gz ../
```

### Compiles and hot-reloads for development
Set up a server
```
npm run serve
```
Run the application
```
npm run debug
```

### Compiles and minifies for production
```
npm run build
```

### Builds a binary for Windows
```
npm run build
npm run package:win
```

### Builds a binary for Linux
```
npm run build
npm run package:linux
```

### Usage
Please see the [wiki](https://github.com/lifematics/aptamCORE/wiki) (Japanese).

### Third party applications
[FLASH2](https://github.com/dstreett/FLASH2)  
[CD-HIT-EST](https://github.com/weizhongli/cdhit)  

### License
MIT License  

### Copyright
Copyright (C) 2020 Lifematics Inc.  
