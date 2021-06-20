////////////////////////////////////////
//////////        全体         //////////
////////////////////////////////////////
import {apiKey, projectId} from './env.js'

//DB初期設定
firebase.initializeApp({
    apiKey: apiKey,
    projectId: projectId
});
const db = firebase.firestore();

document.getElementById('home').addEventListener('click', function() {
    db.collection(roomid).doc('player').update({
        player: firebase.firestore.FieldValue.arrayRemove(myname)
    });
    db.collection(roomid).doc('player').get().then(function(doc) {
        if(doc.data().player.length == 0){
            db.collection(roomid).doc('player').delete();
        }
    });
    db.collection(roomid).doc('gamedata').delete();
    db.collection(roomid).doc('start').delete();
    location.reload();
});

////////////////////////////////////////
//////////       page1        //////////
////////////////////////////////////////
let roomid = '';
let myname = '';
let status = 1; //1が入力画面、2がゲーム開始待機画面、3がゲーム中、4がゲーム終了後

//status = 1
document.getElementById('submitbutton').addEventListener('click', function() {
    roomid = document.getElementById('roomid').value;
    myname = document.getElementById('name').value;
    let len = 0;
    let getlen = new Promise((resolve, reject) => {
        db.collection(roomid).doc('player').get().then(function(doc) {
            len = doc.data().player.length;
        });
        resolve();
    });
    getlen.then(() => {
        if(len < 4){
            db.collection(roomid).doc('player').set({
                player: firebase.firestore.FieldValue.arrayUnion(myname)
            },{merge:true}).then(function() {
                console.log('writing myname success!');
            }).catch(function(error) {
                console.error('Error writing document: ', error);
            });
            document.getElementById('header').style.display = 'block';
            document.getElementById('page1').style.display = 'none';
            document.getElementById('page2').style.display = 'block';
            status = 2;
            page2();
        }else{
            window.alert('このルームは定員オーバーです！');
        } 
    })
});

////////////////////////////////////////
//////////       page2        //////////
////////////////////////////////////////
let player = [];

function page2(){
    db.collection(roomid).doc('player').onSnapshot((doc) => {
        if(status == 2){
            if(doc.exists){
                player = doc.data().player;
                document.getElementById('playerlist').innerHTML = '';
                for(let i = 0; i < player.length; i++){
                    document.getElementById('playerlist').innerHTML +=  player[i] + '<br>';
                }
            }else{
                // doc.data() will be undefined in this case
                console.log('No such document!(memberDB)');
            }
        }
    });
    document.getElementById('startbutton').addEventListener('click', function() {
        if(player.length > 1){
            db.collection(roomid).doc('start').set({
                start: 1
            });
            document.getElementById('page2').style.display = 'none';
            document.getElementById('page3').style.display = 'block';
            status = 3;
            page3();
        }else{
            window.alert('一人ではゲームをスタートできません！');
        }
    });
    db.collection(roomid).doc('start').onSnapshot((doc) => {
        if(status == 2){
            if(doc.exists){
                document.getElementById('page2').style.display = 'none';
                document.getElementById('page3').style.display = 'block';
                status = 3;
                page3();
            }
        }
    });
}

////////////////////////////////////////
//////////       page3        //////////
////////////////////////////////////////

//プレイヤーに関するもの
const playericon = ['🐶', '🐯', '🐴', '🐼']
let mynumber;
let numplayer;
let nowplayer = 0;
let failedplayer = [];

//プレイヤーの初期位置
const playerpositions = [
    [[0, 0],[3, 3], [-1, -1], [-1, -1]],
    [[0, 0],[0, 3], [3, 0], [-1, -1]],
    [[0, 0],[0, 3], [3, 0], [3, 3]]
];
let playerposition;

//プレイヤーの位置マップ
const maplength = 4;
const playermaps = [
    [[0, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [-1, -1, -1, 1]],

    [[0, -1, -1, 1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [2, -1, -1, -1]],

    [[0, -1, -1, 1],
    [-1, -1, -1, -1],
    [-1, -1, -1, -1],
    [2, -1, -1, 3]]
];
let playermap;

//パネルのダメージマップ
let panelmap = [
    [3, 3, 3, 3],
    [3, 3, 3, 3],
    [3, 3, 3, 3],
    [3, 3, 3, 3]
];

//現在のターン
let nowturn = 0;

//パネルの色を描画する関数
function paneldraw(){
    for(let i = 0; i < maplength; i++){
        for(let j = 0; j < maplength; j++){
            let obj = document.getElementById(String(i) + String(j));
            if(panelmap[i][j] == 3){
                obj.style.backgroundColor = 'white';
            }else if(panelmap[i][j] == 2){
                obj.style.backgroundColor = 'yellow';
            }else if(panelmap[i][j] == 1){
                obj.style.backgroundColor = 'red';
            }else if(panelmap[i][j] == 0){
                obj.style.backgroundColor = 'gray';
            }
        }
    }
}

//プレイヤーを描画する関数
function playerdraw(){
    for(let i = 0; i < maplength; i++){
        for(let j = 0; j < maplength; j++){
            let obj = document.getElementById(String(i) + String(j));
            if(playermap[i][j] == -1){
                obj.innerHTML = '　';
            }else{
                obj.innerHTML =　playericon[playermap[i][j]];
            }
        }
    }
}

//ターンを更新する関数
function changeturn(){
    if(failedplayer.length < numplayer - 1){            //プレイヤーが2人以上残っている場合
        do{
            nowplayer++;
            if(nowplayer >= numplayer){
                nowplayer = 0;
            }
        }while(failedplayer.includes(nowplayer));
        document.getElementById('nowplayer').innerHTML = player[nowplayer] + ' ' + playericon[nowplayer];
        nowturn++;
    }else if(failedplayer.length == numplayer){        //プレイヤーが1人だけになった場合（決着）
        nowplayer = failedplayer[numplayer - 1];
        document.getElementById('nowplayer').innerHTML = player[nowplayer] + ' ' + playericon[nowplayer];
    }
}

//移動できるかをチェックする関数
function canmove(x, y){
    if(playermap[x][y] == -1){
        if(distance(x, y) == 1){
            return true;
        }else if(distance(x, y) == 4){
            if(playerposition[nowplayer][0] == x){
                let cy = (playerposition[nowplayer][1] + y) / 2;
                if(playermap[x][cy] !== -1){
                    return true;
                }
            }else if(playerposition[nowplayer][1] == y){
                let cx = (playerposition[nowplayer][0] + x) / 2;
                if(playermap[cx][y] !== -1){
                    return true;
                }
            }
        }
    }
    return false;
}

//今いる位置からの距離を求める関数
function distance(x, y){
    return (playerposition[nowplayer][0] - x) ** 2 + (playerposition[nowplayer][1] - y) ** 2;
}

//移動して位置マップを更新する関数
function move(x, y){
    playermap[playerposition[nowplayer][0]][playerposition[nowplayer][1]] = -1;
    playermap[x][y] = nowplayer;
    playerposition[nowplayer][0] = x;
    playerposition[nowplayer][1] = y;
}

//パネルを更新する関数
function damagepanel(){
    panelmap[playerposition[nowplayer][0]][playerposition[nowplayer][1]]--;
}

//脱落・終了したかを確認する関数
function finishcheck(){
    if(panelmap[playerposition[nowplayer][0]][playerposition[nowplayer][1]] <= 0){      //移動したパネルのHPが0になった場合
        failedplayer.push(nowplayer);
        document.getElementById('failed').innerHTML += String(numplayer - failedplayer.length + 1) + '位: ' + player[nowplayer] + ' ' + playericon[nowplayer] + '<br>';
    }
    if(failedplayer.length == numplayer - 1){                                          //プレイヤーが1人だけになった場合（決着）
        let winner;
        for(let i = 0; i < numplayer; i++){
            if(failedplayer.includes(i) == false){
                winner = i;
            }
        }
        failedplayer.push(winner);
        document.getElementById('failed').innerHTML += String(numplayer - failedplayer.length + 1) + '位: ' + player[winner] + ' ' + playericon[winner] + '<br>';
        window.alert('決着しました。HOMEボタンからトップページに戻ってください。');
        db.collection(roomid).doc('player').delete();
        db.collection(roomid).doc('gamedata').delete();
        db.collection(roomid).doc('start').delete();
    }
}

//DBに書き込む関数
function writeDB(){
    db.collection(roomid).doc('gamedata').set({
        nowturn: nowturn,
        nowplayer: nowplayer,
        failedplayer: failedplayer,
        playerposition0: playerposition[0],
        playerposition1: playerposition[1],
        playerposition2: playerposition[2],
        playerposition3: playerposition[3],
        playermap0: playermap[0],
        playermap1: playermap[1],
        playermap2: playermap[2],
        playermap3: playermap[3],
        panelmap0: panelmap[0],
        panelmap1: panelmap[1],
        panelmap2: panelmap[2],
        panelmap3: panelmap[3]
    })
    .then(function() {
        console.log('writeDB success!');
    })
    .catch(function(error) {
        console.error('Error writing document: ', error);
    });
}

//DBから読み取る関数
function loadDB(){
    db.collection(roomid).doc('gamedata').get().then((doc) => {
        if(doc.exists){
            nowturn = doc.data().nowturn;
            nowplayer = doc.data().nowplayer;
            failedplayer = doc.data().failedplayer;
            playerposition[0] = doc.data().playerposition0;
            playerposition[1] = doc.data().playerposition1;
            playerposition[2] = doc.data().playerposition2;
            playerposition[3] = doc.data().playerposition3;
            playermap[0] = doc.data().playermap0;
            playermap[1] = doc.data().playermap1;
            playermap[2] = doc.data().playermap2;
            playermap[3] = doc.data().playermap3;
            panelmap[0] = doc.data().panelmap0;
            panelmap[1] = doc.data().panelmap1;
            panelmap[2] = doc.data().panelmap2;
            panelmap[3] = doc.data().panelmap3;
            paneldraw();
            playerdraw();
            finishcheck();
            changeturn();
        }else{
            // doc.data() will be undefined in this case
            console.log('No such document!(loadDB)');
        }
    }).catch((error) => {
        console.log('Error getting document:', error);
    });
}



//パネルが押されたら実行
document.addEventListener('click',function(e){
    if(nowplayer == mynumber){
        if(e.target.className == 'panel'){
            let x = Number(e.target.id[0]);
            let y = Number(e.target.id[1]);
            if(canmove(x, y) && failedplayer.length < numplayer - 1){   //パネルに移動できて、プレイヤーが2人以上残っている場合
                move(x, y);
                damagepanel();
                writeDB();
            }
        }
    }
});

//DBに変更があった場合
function DB_observation(){
    db.collection(roomid).doc('gamedata').onSnapshot((doc) => {
        if(doc.exists){
            loadDB();
        }else{
            // doc.data() will be undefined in this case
            console.log('No such document!(gameDB)');
        }
    });
    db.collection(roomid).doc('player').onSnapshot((doc) => {
        if(doc.data().player.length != numplayer && doc.data().player.includes(myname)){
            window.alert('他のプレイヤーが退出しました。HOMEボタンからトップページに戻ってください。');
        }
    });
}

//ゲーム開始時に実行
function page3(){
    mynumber = player.indexOf(myname);
    numplayer = player.length;
    playerposition = playerpositions[numplayer - 2];
    playermap = playermaps[numplayer - 2];
    document.getElementById('myname').innerHTML = player[mynumber] + ' ' + playericon[mynumber];
    document.getElementById('nowplayer').innerHTML = player[nowplayer] + ' ' + playericon[nowplayer];
    paneldraw();
    playerdraw();
    DB_observation(); 
}