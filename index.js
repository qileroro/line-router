'use strict'

function LineRouter() {
  this.segmentRouter = new SegmentRouter();
  this.notfoundHandler = defaultNotFoundHandler;
  this.errorHandler = defaultErrorHandler;
  this.handler = this.handler.bind(this);
}

LineRouter.prototype = {
  handler(req, res) {
    var matchResult = this.matchRoute(req.method, req.url);
    var {handler, params} = matchResult || {handler: this.notfoundHandler};
    req.params = params;
    
    callHandler(handler, req, res).catch((err) => {
      callHandler(this.errorHandler, req, res, err).catch((err) => {
        res.statusCode = 500;
        res.end('Server Error');
      });
    });
  },

  get(path, handler) { this.addRoute('get', path, handler) },

  head(path, handler) { this.addRoute('head', path, handler) },

  post(path, handler) { this.addRoute('post', path, handler) },

  put(path, handler) { this.addRoute('put', path, handler) },

  delete(path, handler) { this.addRoute('delete', path, handler) },

  connect(path, handler) { this.addRoute('connect', path, handler) },

  options(path, handler) { this.addRoute('options', path, handler) },

  trace(path, handler) { this.addRoute('trace', path, handler) },

  patch(path, handler) { this.addRoute('patch', path, handler) },

  addRoute(method, path, handler) {
    var originalSegments = segmentUrl(method, path);
    var objParams = path.indexOf("<") !== -1;
    var mappings = objParams && originalSegments.filter(isArgumentSegment).map(getMapping);
  
    var segments = originalSegments.map((segment) => segment[0] === "<" ? "*" : segment);
    var target = {handler, mappings};
    this.segmentRouter.add(segments, target);
  },

  notfound(handler) {
    this.notfoundHandler = handler;
  },

  error(handler) {
    this.errorHandler = handler;
  },

  matchRoute(method, url) {
    var segments = segmentUrl(method, url);
    var matchResult = this.segmentRouter.match(segments);
    if (matchResult) {
      var {target: {handler, mappings}, params} = matchResult;
      if (mappings) {
        var objParams = {};
        for (var i=0; i<mappings.length; i++) {
          var {name, type} = mappings[i];
          if (type === 'number' && !(/^[0-9]+$/.test(params[i]))) { return; }
          objParams[name] = type === 'number' ? Number(params[i]) : params[i];
        }
        return {handler, params: objParams};
      } else {
        return {handler, params};
      }
    }
  }
}

function SegmentRouter() {
  this.routes = {};
}

SegmentRouter.prototype = {
  add(segments, target) {
    var current = this.routes;
    for (let segment of segments) {
      if (!(segment in current)) {
        current[segment] = {};
      }
      current = current[segment];
    }
    current["/"] = target;
  },

  match(segments) {
    var cursor = this.routes;
    var params = [];
    for (let segment of segments) {
      if (segment in cursor) {
        cursor = cursor[segment];
      } else if ('*' in cursor) {
        params.push(segment);
        cursor = cursor['*'];
      } else {
        cursor = null;
        break;
      }
    }
    if (cursor && cursor['/']) {
      return {target: cursor['/'], params};
    }
  }
}

function segmentUrl(method, url) {
  var segments = removeQuery(url).split('/').filter((item) => item.trim());
  return [method.toUpperCase(), ...segments];
}

function removeQuery(url) {
  var index = url.indexOf("?"); 
  return index === -1 ? url : url.substr(0, index);
}

function isArgumentSegment(segment) {
  return segment === '*' || segment[0] === '<';
}

function getMapping(segment, index) {
  var [name, type] = segment === '*' ? [String(index), 'string'] : segment.substring(1, segment.length-1).split(':');
  return {name, type};
}

function callHandler(handler, req, res, err) {
  return new Promise((resolve, reject) => {
    var resp = err ? handler(err, req, res) : handler(req, res);
    if (resp != undefined && resp['then']) {
      resp.then((resp) => {
        endRes(res, resp, err && 500);
        resolve();
      }).catch((e) => {
        reject(e);
      });
    } else {
      endRes(res, resp, err && 500);
      resolve();
    }
  });
}

function endRes(res, r, statusCode) {
  if (res.finished) {
    return;
  }
  if (statusCode) {
    res.statusCode = statusCode;
  }
  if (typeof(r) != "undefined" && r != null && r.constructor == String) {
    res.end(r);
  } else {
    res.end();
  }
}

function defaultNotFoundHandler(req, res) {
  res.statusCode = 404;
  res.end('Not Found');
}

function defaultErrorHandler(err, req, res) {
  var {statusCode=500} = err;
  res.statusCode = statusCode;
  res.end('Server Error');
}

module.exports = LineRouter;
