const http = require("http");
const express = require("express"); 
const app = express(); 
const path = require("path");
const bodyParser = require("body-parser");
const statusCode = 200;
let fs = require("fs");
process.stdin.setEncoding("utf8");
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') }) 

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

if (process.argv.length != 3) {
    process.exit(1);
}

const portNumber = process.argv[2]
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.tyfa3jx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

app.get("/", (request, response) => {
    let variables = { portNumber: portNumber}
    response.render("index", variables)
});

app.post("/exchange", (request, response) => {
    const { num_people } = request.body;

    let result = ""; 

    for (let i = 1; i <= num_people; i++) {
        result += `<strong>Name: </strong> <input type="text" name="names"> &nbsp; &nbsp;
        <strong>Email Address:</strong> <input type="email" name="emails"> <br><br>`
    }
    
    let variables = { portNumber: portNumber, input_list: result, num_people: num_people}

    response.render("exchange", variables)
});


app.post("/secretSanta", (request, response) => {

   const { names, emails } = request.body
   let name_list = names
   let shuffled = shuffle(name_list)

   let exchanges = []
   for (let i = 0; i < name_list.length; i++) {
       let obj = {name: names[i], email: emails[i], assigned: shuffled[i]}
       exchanges.push(obj)
   }

    async function addExchangeToDB() {
        try {
            await client.connect();
           
            await addExchange(client, databaseAndCollection, exchanges);
    
        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    let variables = { portNumber: portNumber}

    addExchangeToDB().catch(console.error);
    response.render("secretSantaConfirmation", variables)
});


app.post("/removeExchange", (request, response) => { 

    async function removeAllApplications() {
        
        try {
            await client.connect();
            const result = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .deleteMany({});

            const variables = {
                totalApplications: result.deletedCount
            }

            response.render("removedConfirmation", variables)

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }
    removeAllApplications().catch(console.error);
});

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
  
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
  
    return array;
}

async function addExchange(client, databaseAndCollection, exchangeList) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertMany(exchangeList);
}

app.listen(portNumber);
console.log(`Webserver started and running at http://localhost:${portNumber}`);
process.stdout.write(`Stop to shutdown the server: `);
process.stdin.on("readable", function () {
    let dataInput = process.stdin.read();
    if (dataInput !== null ) {
        let command = dataInput.trim();
        if (command === "stop") {
            console.log(`Shutting down the server`)
            process.exit(0);
        } else {
            console.log(`Invalid command: ${command}`)
        }
        process.stdout.write(`Stop to shutdown the server: `);
        process.stdin.resume();
    }
});