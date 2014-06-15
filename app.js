// 
var dotenv = require('dotenv');
dotenv.load();

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
	getOpinions(etagsArray, function () {
		fs.writeFileSync("etags.json",JSON.stringify(etagsArray))
		console.log("All Done!")
	})
}

function commitAll (etagsArray) {
	fs.writeFileSync("etags.json",JSON.stringify(etagsArray))
	console.log("All Done!")
	gitTweet(function () {
		child_process.exec('git commit -am ' + Date.now(), function (err, stdout, stderr) {
			console.log(stdout || stderr)
		})
	})
}

function getOpinions (array, callback) {
	_.each(["08","09","10","11","12","13"], function (year, index, years) {
		request({headers: {"User-Agent":'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'},url:"http://www.supremecourt.gov/opinions/slipopinions.aspx?Term=" + year}, function (error, response, body) {
	  		if (!error && response.statusCode == 200) {
	    		var $ = cheerio.load(body); // Get the slip opinions.
	    		getTags(year, array, $, function() {
	    			(index != years.length - 1 ? callback() : commitAll(array))
	    		})
	  		}
	  		else {
	  			console.log("Something went wrong");
	  		}
		})
	})
}

function getTags (year, array, $, callback) {
	async.each($("a", ".datatables"), function (e, callback){
		link = "http://www.supremecourt.gov/opinions/" + $(e).attr('href');
		getHeaders(link, function (link, etag) {
			if (checkArray(etag, array)) {
				callback()
			}
			else {
				console.log("The etag is different, let's go ahead and download it: " + year + "/" + link)
				array.push(etag)
				dl(year, link)
				callback()
			}
		})
	}, function (err) {
		callback()
	})
}

function getHeaders (link, callback) {
	request.head({method:"GET", url:link}, function (e,r,b) {
		callback(link, r.headers.etag.split(":")[0].replace('"',""))
	})
}

function checkArray (etag, array) {
	return _.contains(array, etag) 
}

function dl(year, link) {
	get(link).toDisk("pdfs/" + year + "/" + path.basename(link).split('_')[0] + '.pdf', function (err) {
		if (err) console.log(err);
	})
}

function gitTweet (callback) {
	var repository = git.open(__dirname)	//Open the repository
	var statusObj = _.pairs(repository.getStatus());	// Get array of [file, status] in the repository.

	// Go through each [file, status] 
	_.each(statusObj, function (f) {

		//If the file is changed and is in the pdfs directory
		if (f[1] != 1 && f[0].substr(0,4) == "pdfs") {

			//Shell out to add the file to git 
			child_process.exec('git add ' + f[0], function (err, stdout, stderr) {
				
				// Tweet that the file has been added/changed
				tweet(f[0],f[1])
			})
		}
	})
	callback()
}

function tweet (name, status, callback) {
	var newOp = "SCOTUS has posted a new opinion. Download at http://code.esq.io/scotus-servo/" + name;
	var changedOp = "Looks like SCOTUS has changed its opinion for No. " + path.basename(name,".pdf") + ". Link to latest opinion at http://code.esq.io/scotus-servo/" + name;
	var tweetText = (status == 128 ? newOp : changedOp)

	T.post('statuses/update', { status: tweetText }, function(err, data, response) {
  		console.log(data)
	})

}