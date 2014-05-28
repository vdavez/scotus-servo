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
	request('http://www.supremecourt.gov/opinions/slipopinions.aspx?Term=13', function (error, response, body) {
  		if (!error && response.statusCode == 200) {
    		var $ = cheerio.load(body); // Get the slip opinions.
    		getTags(array, $, function() {
    			callback()
    		})
  		}
  		else {
  			console.log("Something went wrong");
  		}
	})
}

function getTags (array, $, callback) {
	async.each($("a", ".datatables"), function (e, callback){
		link = "http://www.supremecourt.gov/opinions/" + $(e).attr('href');
		getHeaders(link, function (link, etag) {
			if (checkArray(etag, array)) {
				console.log("The etag checks out, no need to do anything")
				callback()
			}
			else {
				console.log("The etag is different, let's go ahead and download it")
				etagsArray.push(etag)
				dl(link)
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

function dl(link) {
	get(link).toDisk("pdfs/" + path.basename(link), function (err) {
		if (err) console.log(err);
	})
}