#!/usr/bin/env node

var http = require('http')
var url = require('url')
var util = require('util')

// 3rd party
var lame = require('lame')
var Speaker = require('speaker')
var Promise = require('bluebird')

// package.json info
var packageInfo = require('./package.json')

var STREAM_URL = 'http://kcrw.ic.llnwd.net/stream/kcrw_live'
var CURRENT_TRACK_URL = 'http://tracklist-api.kcrw.com/Simulcast'
var NOW_PLAYING_URL = 'http://www.kcrw.com/now_playing.json'

var USER_AGENT = util.format('node-kcrw (%s)', packageInfo.version)
console.log(USER_AGENT)


get(STREAM_URL, function(res) {
	res.pipe(new lame.Decoder())
	   .pipe(new Speaker())

	printLatestTrack()
})


/* Hoisted functions only */

// get the width of terminal, or default
function columnWidth() {
	if (process && process.stdout && !isNaN(process.stdout.columns)) {
		return process.stdout.columns
	}
	return 80
}

// wrap up HTTP get requests with a user agent
function get(uri, callback) {
	var parsed = url.parse(uri)
	var options = {
		protocol: parsed.protocol,
		auth: parsed.auth,
		hostname: parsed.hostname,
		path: parsed.path,
		port: parsed.port,
		headers: {
			'User-agent': USER_AGENT
		}
	}
	return http.get(options, callback)
}

// returns a promise, wrapping our get() fn
function getAnd(uri) {
	return new Promise(function(resolve, reject) {
		var req = get(uri, function(res) {
			var data = ''

			res.on('data', function(chunk) {
				data += chunk
			})

			res.on('end', function() {
				resolve(data)
			})
		})
	
		req.on('error', function(err) {
			reject(err)
		})
	})
}

// wrap lines, breaking on spaces columns arg is optional number
function notTooWide(str, columns) {
	if (isNaN(columns)) columns = columnWidth()
	
	var indentStr = '  '
	var lines = Array(indentStr)
	var words = str.split(' ')
	
	words.forEach(function(word, i) {
		var lastLine = lines[lines.length-1] // this is a copy, not reference
		if ((lastLine.length + word.length) < columns) {
			lines[lines.length-1] =	 util.format('%s%s ', lastLine, word)
		} else {
			lines.push( util.format('%s%s ', indentStr, word) )
		}
	})
	return lines.join('\n')
}

// calls checkLatest recursively internally
function printLatestTrack() {
	var currentTrackBody = null
	var currentHost = null

	checkLatest()

	function checkLatest() {
		Promise.all([
			getAnd(NOW_PLAYING_URL),
			getAnd(CURRENT_TRACK_URL)
		]).spread( function(nowPlayingData, currentTrackData) {
			var nowPlaying = JSON.parse(nowPlayingData)
			
			// check for host change
			var host1 = nowPlaying['hosts'][0]['name']
			if (host1 != currentHost) {
				currentHost = host1
				
				var stationBadge = 'KCRW: Member supported independent public radio - http://kcrw.com/join'
				var sep = Array(columnWidth()+1).join('=')
				
				console.log( util.format('\n%s\n%s\n\nCurrent Host: %s (%s)\n%s\n\n', sep, stationBadge, host1, nowPlaying.show_title, sep) )
			}
			
			// if no songlist key in now playing data, 
			// then track listing is wrong (could eventually use the segments part)
			// so we skip the rest, check again a bit later
			if (nowPlaying.songlist === null) {
				currentTrackBody = null
				setTimeout(checkLatest, 30*1000)
				return
			} 
			
			// track is unchanged, check again soon
			if (currentTrackBody == currentTrackData) {
				setTimeout(checkLatest, 4*1000)
				return
			}
			
			// print out current track info
			currentTrackBody = currentTrackData
			var song = JSON.parse(currentTrackData)
			
			var lines = ['','','']
			lines[0] = util.format('“%s” by %s', song.title, song.artist)

			if (song.album) lines[1] += song.album
			if (song.year > 0) lines[1] += util.format(' (%s)', song.year)

			if (song.comments) lines[2] = util.format("More info:\n%s", notTooWide(song.comments))
			
			lines.push('\n')
			console.log(lines.join('\n'))
			setTimeout(checkLatest, 4000)
		})
	}
}
