// 
var request = require('request');
var cheerio = require('cheerio');
var get = require('get')
var async = require('async')
var _ = require('underscore');
var fs = require('fs')
var path = require('path')

start()

function start () {
	var f = JSON.parse(fs.readFileSync("etags.json", encoding="utf-8"))
	var etagsArray = f.map(function (tag, i, etags) {return tag.split(":")[0]})
	getOpinions(etagsArray, function () {
		fs.writeFileSync("etags.json",JSON.stringify(etagsArray))
		console.log("All Done!")
	})
}

function getOpinions (array, callback) {
	_.each(["08","09","10","11","12","13"], function (year, index, years) {
		request({headers: {"User-Agent":'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)'},url:"http://www.supremecourt.gov/opinions/slipopinions.aspx?Term=" + year}, function (error, response, body) {
	  		if (!error && response.statusCode == 200) {
	    		var $ = cheerio.load(body); // Get the slip opinions.
	    		getTags(year, array, $, function() {
	    			callback()
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
				console.log("The etag checks out, no need to do anything")
				callback()
			}
			else {
				console.log("The etag is different, let's go ahead and download it")
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
	get(link).toDisk("pdfs/" + year + "/" + path.basename(link), function (err) {
		if (err) console.log(err);
	})
}
