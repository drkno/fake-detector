## Fake Video Detector

Detects fake video files using a series of example images.

### Usage

```
docker run --rm -it -v <path_to_video_directory>:/videos drkno/fake-detector:latest /videos
```

### Options

```
fake-detector [options] <path>

Arguments:
  path                                  path to input file or directory

Options:
  -V, --version                         output the version number
  -e, --examples <path>                 path to examples (default: "/app/examples")
  -t, --threshold <value>               number of bits in hash which can be different (default: 5)
  -w, --workingDirectory <path>         path to store temporary files (default: "/tmp")
  -i, --exampleExtensions <extensions>  accepted extensions for examples (default: [".png",".jpg"])
  -x, --videoExtensions <extensions>    accepted extensions for video files (default: [".avi",".mp4",".mkv",".mov",".vob"])
  -l, --logLevel <level>                log level (default: "info")
  -h, --help                            display help for command
```