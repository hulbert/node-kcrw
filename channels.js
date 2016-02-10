module.exports = {
	live: {
		stream: 'http://kcrw.ic.llnwd.net/stream/kcrw_live',
		track: 'http://tracklist-api.kcrw.com/Simulcast',
		nowPlaying: 'http://www.kcrw.com/now_playing.json'
	},
	eclectic24: {
		stream: 'http://kcrw.ic.llnwd.net/stream/kcrw_music',
		track: 'http://tracklist-api.kcrw.com/Music',
		nowPlaying: 'http://www.kcrw.com/now_playing.json?channel=kcrwmusic'
	}
}
