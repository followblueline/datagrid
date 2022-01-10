// nodeJS basic server on port 3000
// start with:
// node app.js
// and open with http://localhost:3000 or http://localhost:3000/index.html


const http = require('http');
const fs = require('fs').promises;
const util = require('util');
const PORT = process.env.PORT || 3000;
const defaultFile = 'index.html';




const requestListener = function (req, res) {

    //console.log('req', req.url, req.method);//, req.headers, req.rawHeaders);

    if (!req){
        console.warn("no req");
        res.writeHead(500);
        res.end(err);
        return;
    }

    var filepath = req.url.replace(/\//g, '\\');
    if (filepath.includes('?'))
    filepath = filepath.substr(0, filepath.indexOf('?'));
    filepath = checkForDefaultFile(filepath);

    //console.log("loading " + __dirname + filepath);
    fs.readFile(__dirname + filepath)
    .then(contents => {
        var contentType = "";
        var extension = (filepath || "").substr((filepath || "").lastIndexOf("."));
        switch(extension.toLowerCase()){
            case ".html": contentType = "text/html"; break;
            case ".js": contentType = "application/javascript"; break;
            case ".css": contentType = "text/css"; break;
            case ".jpeg": contentType = "image/jpeg"; break;
            case ".jpg": contentType = "image/jpeg"; break;
            case ".gif": contentType = "image/gif"; break;
            case ".png": contentType = "image/png"; break;
            case ".md": contentType = "text/markdown"; break;
            default:  contentType = "text/html"; break;
        }
        res.setHeader("Content-Type", contentType);
        res.writeHead(200);
        res.end(contents);
        //console.log(filepath + " OK");
    })
    .catch(err => {
        if (err.code == "ENOENT"){
            console.warn("err", err.code, err.path );
            res.writeHead(404);
            res.end("app.js: No file at " + err.path)
        } else {
            console.warn("app.js: err", err.code, );
            res.end(err ? err.code : "Unkown error");
        }
        return;
    })
    .finally(() => {
        //console.log("finally");
    });
}

const server = http.createServer(requestListener);
server.listen(PORT);
console.log('Node.js web server at port '+PORT+' is running..');

function checkForDefaultFile(url){
    if (url == '' || url == '/' || url == '\\')
       url = '/' + defaultFile;
    return url;
}