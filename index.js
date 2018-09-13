'use strict'

const routes = {};

function router(req, res) {
  var [handler, params] = matchRoute(req.method, req.url);
  req.params = params;

  handler = handler ? handler : notfound_handler;
  doHandler(req, res, handler);
}

function doHandler(req, res, handler, err) {
  var rv = err ? handler(req, res, err) : handler(req, res);
  if (rv && rv['then']) {
    rv.then(function(resp) {
      res.end(resp);
    }).catch(function(e) {
      if (!err) {
        doHandler(req, res, error_handler, e);
      } else {
        res.end();
      }
    });
  } else if(rv && !res.finished) {
    try {
      res.end(rv);
    } catch (e) {
      if (!err) {
        doHandler(req, res, error_handler, e);
      } else {
        res.end();
      }
    }
  } else {
    res.end();
  }
}

router.get = (path, handler) => { addRoute("get", path, handler) };
router.head = (path, handler) => { addRoute("head", path, handler) };
router.post = (path, handler) => { addRoute("post", path, handler) };
router.put = (path, handler) => { addRoute("put", path, handler) };
router.delete = (path, handler) => { addRoute("delete", path, handler) };
router.connect = (path, handler) => { addRoute("connect", path, handler) };
router.options = (path, handler) => { addRoute("options", path, handler) };
router.trace = (path, handler) => { addRoute("trace", path, handler) };
router.patch = (path, handler) => { addRoute("patch", path, handler) };

router.notfound = (fn) => { notfound_handler = fn; }
router.error = (fn) => { error_handler = fn; }

var notfound_handler = (req, res) => {
  res.statusCode = 404;
  res.end('Not found');
}

var error_handler = (req, res, err) => {
  res.statusCode = 500;
  res.end('Server Error');
}

//   addRoute("get", "/users/<userid>/posts", handler)
//   matchRoute("GET", "/users/1001/posts")
//   --> [handler, [userid: "1001"]]

//   addRoute("get", "/users/*/posts/<postid:number>", handler)
//   matchRoute("GET", "/users/1001/posts/10000")
//   --> [handler, ["1001", postid: 10000]]

function addRoute(method, path, handler) {
  var segments = segment(method, path);
  var isObjParams = path.indexOf("<") !== -1;
  var convertedSegments = segments.map((item) => item[0] === "<" ? "*" : item);
  add(convertedSegments, getResolveFunc(isObjParams, handler, segments));
}

function matchRoute(method, url) {
  var segments = segment(method, url);
  var [resolve, params] = match(segments);
  return resolve ? resolve(params) : [null, null];
}

function segment(method, url) {
  var segments = removeQuery(url).split('/').filter((item) => item.trim());
  return [method.toUpperCase(), ...segments];
}

function removeQuery(url) {
  var index = url.indexOf("?"); 
  return index === -1 ? url : url.substr(0, index);
}

function getResolveFunc(isObjParams, handler, segments) {
  if (!isObjParams) {
    return (params) => [handler, params];
  }

  // [{index, name, type}]
  var mappings = segments.filter((item) => item === '*' || item[0] === '<').map((item, index) => {
    return item === '*' ? [index, 'string'] : item.substring(1, item.length-1).split(':');
  });

  // var setFunctions = segments.filter((item) => item === '*' || item[0] === '<').map((item) => {
  //   if (item === '*') {
  //     return (result, value) => { result.push(value); };
  //   } else {
  //     var [name, type] = item.substring(1, item.length-1).split(':');
  //     if (["string", "number", undefined].indexOf(type) === -1) {
  //       throw new Error('Unsupported Type: ' + type);
  //     }
  //     return (result, value) => { 
  //       result.push(value); 
  //       result[name] = type === 'number' ? Number(value) : value; 
  //     };
  //   }
  // });

  return (params) => {
    var result = {};
    mappings.forEach(function([name, type], index) {
      result[name] = type === 'number' ? Number(params[index]) : params[index];
    });
    return [handler, result];
    // var result = [];
    // for (var i=0; i<params.length; i++) {
    //   setFunctions[i](result, params[i]);
    // }
    // return [handler, result];
  };
}

//   add(["get", "users", "*", "posts"], "target1")
//   match(["get", "users", "1001", "posts"]) 
//   --> ["target1", ["1001"]]

function add(segments, target) {
  var current = routes;
  for (let segment of segments) {
    if (!(segment in current)) {
      current[segment] = {};
    }
    current = current[segment];
  }
  current["/"] = target;
}

function match(segments) {
  var current = routes;
  var params = [];
  for (let segment of segments) {
    if (segment in current) {
      current = current[segment];
    } else if ('*' in current) {
      params.push(segment);
      current = current['*'];
    } else {
      current = null;
      break;
    }
  }
  if (current && current['/']) {
    return [current['/'], params];
  } else {
    return [null, null];
  }
}

module.exports = router;
