# node-kcrw

Play the KCRW live stream in your Terminal. Because why not.  
Made mostly possibe by [node-lame][NodeLame] and [node-speaker][NodeSpeaker].

## Install

With [npm](https://npmjs.org) do (you may need sudo):

```
npm install -g kcrw
```

## Dependencies

On Debian/Ubuntu, the [ALSA][alsa] backend is selected by default, so be sure
to have the `alsa.h` header file in place:

``` bash
$ sudo apt-get install libasound2-dev
```

## Usage

Play KCRW:

```
$ kcrw
```

## Notes

Haven't tested on Windows. Would like to add KCRW's 24/7 streams (both news & music to be played via command line args).

## License

MIT

[NodeLame]: https://github.com/TooTallNate/node-lame
[NodeSpeaker]: https://github.com/TooTallNate/node-speaker
[alsa]: http://www.alsa-project.org/
