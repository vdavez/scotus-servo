var http = require("http");

var options = {
	"path": "/opinions/slipopinions.aspx?Term=13",
	"host": "www.supremecourt.gov",
//	"connection": 'keep-alive',
	"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"//,
//	"user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36",
//	"referrer": "http://www.supremecourt.gov/opinions/opinions.aspx",
//	"accept-encoding": "gzip,deflate,sdch",
//	"accept-language": "en-US,en;q=0.8m"
}

http.request(options, function(response) {
  var str = ''
  response.on('data', function (chunk) {
    str += chunk;
  });

  response.on('end', function () {
    console.log(str);
  });
})