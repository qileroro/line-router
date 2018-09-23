var http = require('http');
var Router = require('./index');

router = new Router();

router.get('/', async (req, res) => "hello home");
router.get('/test', (req, res) => JSON.stringify(req.params));
router.get('/people/*/posts', async (req, res) => JSON.stringify(req.params));
router.get('/members/<memberId:number>/posts/<postName>', async (req, res) => JSON.stringify(req.params));
router.get('/users/<userId:number>/posts/*', async (req, res) => JSON.stringify(req.params));
router.notfound(async (req, res) => "404");
router.error(async (req, res) => "500");

http.createServer(router.handler).listen(3000);
