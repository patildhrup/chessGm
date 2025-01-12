
const express = require('express');
const app = express();
const path = require('path');
const http = require('http')
const {Chess} = require('chess.js')
const socket = require('socket.io');

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Configure EJS
app.set('view engine', 'ejs');

const server = http.createServer(app)
const io = socket(server) // Realtime bidirectional interaction

const chess = new Chess()
let players = {}
let currentPlayer = 'w'

io.on('connection',function(uniquesocket){
    console.log('connected');
    
    // received from browser
    uniquesocket.on('msg1',function() {
        console.log('A client connected:', uniquesocket.id,"msg1 received on backend");
        io.emit('msg2') // send to browser
    })
    

    if(!players.white){
        players.white = uniquesocket.id;
        uniquesocket.emit('playerRole','w')
    } else if(!players.black){
        players.black = uniquesocket.id;
        uniquesocket.emit('playerRole','b')
    } else{
        uniquesocket.emit('spectatorRole')
    }

    uniquesocket.on('disconnect',function() {
        if (uniquesocket.id === players.white) {
            delete players.white
        } else if (uniquesocket.id === players.black) {
            delete players.black
        } 
    })

    uniquesocket.on('move',(move)=>{
        try{
            if(chess.turn() === 'w' && uniquesocket.id !== players.white) return;
            if(chess.turn() === 'b' && uniquesocket.id !== players.black) return;

            const result= chess.move(move);
            if(result){
                currentPlayer = chess.turn();
                io.emit('move',move) // send to client side
                io.emit('boardState',chess.fen())
            }
            else{
                console.log('Invalid move',move);
                uniquesocket.emit('InvalidMove',move)
            }
        }
        catch (err){
            console.log(err);
            console.log('Invalid move',move);

        }
    })

})

// Routes
app.get('/', (req, res, next) => {
    res.render('index'); // Render the EJS index file
});

// Start the server
server.listen(3000, () => console.log('Server running on http://localhost:3000'));