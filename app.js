// Load environmental variables
var dotenv = require('dotenv');
dotenv.load();

var argv = require('minimist')(process.argv.slice(2)); // use minimist to access the years

var request = require('request');
var cheerio = require('cheerio');
var get = require('get');
var async = require('async');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var git = require('git-utils');
var child_process = require('child_process');
var Twit = require('twit');

var T = new Twit({
    consumer_key: process.env.CONSUMER_KEY
  , consumer_secret: process.env.CONSUMER_SECRET
  , access_token: process.env.ACCESS_TOKEN
  , access_token_secret: process.env.ACCESS_TOKEN_SECRET
})

start()

function start (callback) {
	var f = JSON.parse(fs.readFileSync("etags.json", encoding="utf-8"))
	var etagsArray = f.map(function (tag, i, etags) {return tag.split(":")[0]})
	getOpinions(etagsArray)
}

function commitAll (etagsArray) {
	fs.writeFileSync("etags.json",JSON.stringify(etagsArray))
	console.log("All Done!")
}

function getOpinions (array) {
	_.each(argv._, function (year, index, years) {
		setTimeout(function () {
			request({headers: {"User-Agent":'scotus_servo (https://github.com/vzvenyach/scotus-servo)'},url:"http://www.supremecourt.gov/opinions/slipopinion/" + year}, function (error, response, body) {
		  		if (!error && response.statusCode == 200) {
		    		var $ = cheerio.load(body); // Get the slip opinions.
		    		getTags(year, array, $, function() {
		    			commitAll(array)
		    		})
		  		}
		  		else {
		  			console.log("Something went wrong");
		  		}
			})
		}, 1000 * index);	// added 
	})
}

function getTags (year, array, $, next) {
	async.eachSeries($("a", ".table-bordered"), function (e, callback){
		link = "http://www.supremecourt.gov" + $(e).attr('href');
		getHeaders(link, function (link, etag) {
			if (checkArray(etag, array)) {
				setTimeout(callback,1000)
			}
			else {
				console.log("The etag is different, let's go ahead and download it: " + link)
				if (etag != null) {
					array.push(etag)
					dl(year, link, $(e).text(), function () { 
						setTimeout(callback,1000)
					})
				}
				else {
					setTimeout(callback,1000)
				}
			}
		})
	}, function (err) {
		next()
	})
}

function getHeaders (link, callback) {
	// setTimeout(function () {
		request.head({url:link}, function (e,r,b) {
			try {
				callback(link, r.headers.etag.split(":")[0].replace('"',""))
			}
			catch (err) {
				console.log([link, err]);
				callback(link, r.headers.etag)
			}
		})
	// }, 1000);
}

function checkArray (etag, array) {
	return _.contains(array, etag) 
}

function dl(year, link, op_name, callback) {
	var fname = "pdfs/" + year + "/" + path.basename(link, ".pdf").split('_')[0] + '.pdf'
	get(link).toDisk(fname, function (err) {
		if (err) console.log(err);
		gitTweet(link, op_name, fname, callback)
	})
}

function gitTweet (link, op, fname, callback) {
	var repository = git.open(__dirname)	//Open the repository
	var statusObj = _.pairs(repository.getStatus());	// Get array of [file, status] in the repository.
	tweet(link, fname, repository.getStatus()[fname], op)
	child_process.exec('git add ' + fname, function (err, stdout, stderr) {		
		callback()
	})
}

function tweet (link, name, status, op, callback) {
	if (status == 1) return false;
	if (op.length > 45) {
		op = op.substr(0,45) + "…"
	}
	var newOp = "SCOTUS has ruled in " + op + " " + link + " (Backup: http://code.esq.io/scotus-servo/" + name + ")";	
	child_process.exec('git log -n 1 --pretty=format:%H -- ' + name, function (err, stdout, stderr) {
		var oldLink = "https://raw.githubusercontent.com/vzvenyach/scotus-servo/" +stdout + "/" + name; 
		var changedOp = "POSSIBLE CHANGE ALERT in " + op + " (before " + oldLink + " & after http://code.esq.io/scotus-servo/" + name + ")";
		var tweetText = (status == 128 ? newOp : changedOp)

		// New Sanity Check before Tweeting
		// Compare the file in the system with the previous file
		compareHashes(name, stdout + " " + name, function (match) {
			if (!match) {
				console.log(tweetText)
				T.post('statuses/update', { status: tweetText }, function(err, data, response) {
		  			console.log(data)
				})
			}
			else if (match) {
				console.log("This is a false positive! Very naughty Supreme Court: " + name)
			}
		})
	})
}

function compareHashes(opn_1, opn_2, callback) {
	child_process.exec('git hash-object ' + opn_1, function (err, stdout, stderr) {
		var hash1 = stdout.trim();
		child_process.exec('git ls-tree ' + opn_2, function (e, so, se) {
			hash2 = so.split(/\t/)[0].split(/\s/)[2].trim()
	 		console.log([hash1, hash2])
			if (hash1 == hash2) {callback(true)}
			else{callback(false)}
		})
	})
}
