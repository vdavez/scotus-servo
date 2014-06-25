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
	getOpinions(etagsArray)
}

function commitAll (etagsArray) {
	fs.writeFileSync("etags.json",JSON.stringify(etagsArray))
	console.log("All Done!")
}

function getOpinions (array) {
	_.each(["08","09","10","11","12","13"], function (year, index, years) {
		request({headers: {"User-Agent":'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'},url:"http://www.supremecourt.gov/opinions/slipopinions.aspx?Term=" + year}, function (error, response, body) {
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
	})
}

function getTags (year, array, $, next) {
	async.each($("a", ".datatables"), function (e, callback){
		link = "http://www.supremecourt.gov/opinions/" + $(e).attr('href');
		getHeaders(link, function (link, etag) {
			if (checkArray(etag, array)) {
				callback()
			}
			else {
				console.log("The etag is different, let's go ahead and download it: " + link)
				array.push(etag)
				dl(year, link, $(e).text(), function () { 
					callback()
				})
			}
		})
	}, function (err) {
		next()
	})
}

function getHeaders (link, callback) {
	request.head({method:"GET", url:link}, function (e,r,b) {
		try {
			callback(link, r.headers.etag.split(":")[0].replace('"',""))
		}
		catch (err) {
			callback(link, r.headers.etag)
		}
	})
}

function checkArray (etag, array) {
	return _.contains(array, etag) 
}

function dl(year, link, op_name, callback) {
	get(link).toDisk("pdfs/" + year + "/" + path.basename(link).split('_')[0] + '.pdf', function (err) {
		if (err) console.log(err);
		gitTweet(link, op_name, "pdfs/" + year + "/" + path.basename(link).split('_')[0] + '.pdf', callback)
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
		T.post('statuses/update', { status: tweetText }, function(err, data, response) {
  			console.log(data)
		})
	})
}
