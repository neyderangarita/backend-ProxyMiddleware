require("dotenv").config();

const express = require("express");
const app = express();
const session = require("express-session");
const secret = process.env.SESSION_SECRET;
const store = new session.MemoryStore();
const port = 4000;
const cors = require("cors");
const helmet = require("helmet");


const { createProxyMiddleware, responseInterceptor } = require("http-proxy-middleware");

const protect = (req, res, next) => {
    const { authenticated } = req.session;
  
    if (!authenticated) {
      res.sendStatus(401);
    } else {
      next();
    }  
};

app.disable("x-powered-by");
app.use(cors());
app.use(helmet());


app.use(
    session({
      secret,
      resave: false,
      saveUninitialized: true,
      store,
    })
);
  
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

app.use(
    "/api/items",
    createProxyMiddleware({
      target: "https://api.mercadolibre.com/sites/MLA/search",
      changeOrigin: true,
      selfHandleResponse: true,
      pathRewrite: {
        [`^/api/items`]: "",
      },
      onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        
        //const response = responseBuffer.toString('utf8'); // convert buffer to string
        let data = JSON.parse(responseBuffer.toString('utf8'));
        let dataEmpy = {};               
        let categoria = [];
        let itemsNew = [];

        data.available_filters.forEach(filter => {
            if(filter.id == "category"){
                filter.values.forEach(value => {
                    categoria.push(value.name);
                });                
            }
        });

        for(var i in data.results) {    
            let item = data.results[i];
            let pice = item.prices;
            let precio = "";

            pice.prices.forEach(element => {                
                precio = element;
            });

            itemsNew.push({ 
                "id" : item.id,
                "title"  : item.title,
                "price": {
                    "currency": precio.currency_id,
                    "amount": precio.amount,
                    "decimals": 1,
                },
                "picture": item.thumbnail,
                "condition": item.condition,
                "free_shipping": item.shipping.free_shipping,
                "city": item.address.city_name
            });
        }

        data = Object.assign({}, dataEmpy,  { 
            author: {
                name: "neyder",
                lastname: "angarita osorio"
            },
            categories: categoria,  
            items: itemsNew,
            itemsOld: data
        }
        );

        return JSON.stringify(data); 

      }),
      
    })
)

app.use(
    "/api/item",
    createProxyMiddleware({
      target: "https://api.mercadolibre.com/items/",
      changeOrigin: true,
      selfHandleResponse: true,
      pathRewrite: {
        [`^/api/item`]: "",
      },
      
      onProxyRes: responseInterceptor(async (responseBuffer, proxyRes, req, res) => {
        
        //const response = responseBuffer.toString('utf8'); // convert buffer to string
        let data = JSON.parse(responseBuffer.toString('utf8'));         
        let itemsNew = {};
        let dataEmpy = {};     

        itemsNew = { 
                "id" : data.id,
                "title"  : data.title,
                "price": {
                    "currency": data.currency_id,
                    "amount": data.price,
                    "decimals": 1,
                },
                "picture": data.thumbnail,
                "condition": data.condition,
                "free_shipping": data.shipping.free_shipping,
                "sold_quantity": data.sold_quantity,
                "description": data.descriptions          
        }

        data = Object.assign({}, dataEmpy,  { 
            author: {
                name: "neyder",
                lastname: "angarita osorio"
            },
            item: itemsNew,
        }
        );

        return JSON.stringify(data); 
      }),
    })
);
