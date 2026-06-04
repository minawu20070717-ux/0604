let video;
let handPose;
let hands = [];

// 遊戲與教學狀態
let score = 0;
let currentItem;
let itemX, itemY;
let itemSpeed = 3.5;
let itemType = ""; // "RECYCLABLE" 或 "TRASH"
let itemName = "";

let bucketX;
let bucketTargetX;
let bucketY;
const BUCKET_WIDTH = 140;
const BUCKET_HEIGHT = 65;

// 教學物件資料庫
const recyclableItems = ["寶特瓶", "廢紙箱", "玻璃瓶", "鋁罐"];
const trashItems = ["香蕉皮", "髒衛生紙", "零食包裝", "塑膠袋"];

let currentGesture = "等待手部引導...";

function preload() {
    // 採用與連結範例相同的最新 handPose 鏡像初始化語法
    handPose = ml5.handPose({ flipped: true });
}

function setup() {
    createCanvas(640, 480);
    rectMode(CENTER);

    // 啟動視訊與自動鏡像翻轉
    video = createCapture(VIDEO, { flipped: true });
    video.hide();

    // 啟動 AI 手勢偵測
    handPose.detectStart(video, gotHands);

    // 初始化遊戲物件位置
    resetItem();
    bucketX = width / 2;
    bucketY = height - 70;
    bucketTargetX = width / 2;
}

function gotHands(results) {
    hands = results;
}

function draw() {
    // 繪製視訊底圖
    image(video, 0, 0, width, height);

    // 半透明柔和教學遮罩，提升文字可讀性
    background(255, 255, 255, 160);

    // 1. 繪製左右兩側的教學分類提示區
    drawTeachingZones();

    // 2. 處理手勢辨識與關鍵點繪製 (整合範例 API)
    processHandTracking();

    // 3. 處理掉落物件與得分判定
    manageFallingObjects();

    // 4. 更新並繪製動態滑行垃圾桶
    updateRecycleBucket();

    // 5. 顯示上方計分板與下方的 AI 狀態列
    drawUI();
}

// 繪製教學分類區域
function drawTeachingZones() {
    noStroke();
    // 左邊：資源回收教學區
    fill(46, 204, 113, 25);
    rect(width * 0.25, height / 2, width / 2, height);
    
    // 右邊：一般垃圾教學區
    fill(231, 76, 60, 25);
    rect(width * 0.75, height / 2, width / 2, height);

    // 教學提示文字
    textSize(16);
    fill(39, 174, 96);
    textAlign(LEFT, TOP);
    text("【綠色資源回收區】\n🖐️ 張開手掌 -> 桶子往左移\n(適合：寶特瓶、廢紙、鋁罐)", 20, 20);

    fill(192, 57, 43);
    textAlign(RIGHT, TOP);
    text("【紅色一般垃圾區】\n✊ 兩指捏緊/握拳 -> 桶子往右移\n(適合：香蕉皮、髒衛生紙、塑膠袋)", width - 20, 20);
}

// 處理手部追蹤與視覺回饋
function processHandTracking() {
    if (hands.length > 0) {
        let hand = hands[0];
        
        let thumb = hand.thumb_tip;
        let index = hand.index_finger_tip;

        // 計算食指尖和大拇指尖的距離
        let d = dist(thumb.x, thumb.y, index.x, index.y);

        // 畫出所有偵測到的手部特徵點 (與範例視覺效果一致)
        for (let i = 0; i < hand.keypoints.length; i++) {
            let kp = hand.keypoints[i];
            fill(41, 128, 185);
            noStroke();
            ellipse(kp.x, kp.y, 8, 8);
        }

        // 判定手勢與垃圾桶目標位置
        if (d < 45) {
            currentGesture = "✊ 分類動作：一般垃圾 (捏緊/握拳)";
            bucketTargetX = width * 0.75; // 垃圾桶滑向右側
            
            // 畫出抓取連線
            stroke(231, 76, 60);
            strokeWeight(3);
            line(thumb.x, thumb.y, index.x, index.y);
        } else if (d > 80) {
            currentGesture = "🖐️ 分類動作：資源回收 (張開手)";
            bucketTargetX = width * 0.25; // 垃圾桶滑向左側
            
            // 畫出放開連線
            stroke(46, 204, 113);
            strokeWeight(2);
            line(thumb.x, thumb.y, index.x, index.y);
        }
    } else {
        currentGesture = "未偵測到手部，請將手移入畫面中";
    }
}

// 隨機生成下一項教學垃圾
function resetItem() {
    itemY = -30;
    itemX = random(100, width - 100);
    itemSpeed = random(3.5, 5.5) + (score * 0.1); // 難度隨分數微幅提升

    if (random(1) > 0.5) {
        itemType = "RECYCLABLE";
        itemName = random(recyclableItems);
    } else {
        itemType = "TRASH";
        itemName = random(trashItems);
    }
}

// 處理垃圾掉落與碰撞得分
function manageFallingObjects() {
    itemY += itemSpeed;

    // 繪製物件精美小字卡
    push();
    stroke(127, 140, 141);
    strokeWeight(1.5);
    fill(255);
    rect(itemX, itemY, 110, 38, 6);
    
    noStroke();
    fill(44, 62, 80);
    textAlign(CENTER, CENTER);
    textSize(15);
    text(itemName, itemX, itemY);
    pop();

    // 垃圾桶碰撞範圍偵測
    if (itemY >= bucketY - BUCKET_HEIGHT/2 && itemY <= bucketY + BUCKET_HEIGHT/2) {
        if (itemX > bucketX - BUCKET_WIDTH/2 && itemX < bucketX + BUCKET_WIDTH/2) {
            
            // 檢查學生的分類邏輯是否正確
            if ((itemType === "RECYCLABLE" && bucketX < width/2) || 
                (itemType === "TRASH" && bucketX > width/2)) {
                score += 10; // 分類正確
            } else {
                score = max(0, score - 5); // 分類錯誤
            }
            resetItem();
        }
    }

    // 漏接判定
    if (itemY > height + 40) {
        resetItem();
    }
}

// 更新與繪製垃圾桶
function updateRecycleBucket() {
    // 運用 lerp 動態公式讓垃圾桶具有流暢滑行的物理回饋感
    bucketX = lerp(bucketX, bucketTargetX, 0.15);

    push();
    stroke(52, 73, 94);
    strokeWeight(2);
    
    // 根據所在區域切換桶子顏色
    if (bucketX < width / 2) {
        fill(46, 204, 113); // 資源回收桶 (綠色)
    } else {
        fill(231, 76, 60); // 一般垃圾桶 (紅色)
    }

    rect(bucketX, bucketY, BUCKET_WIDTH, BUCKET_HEIGHT, 8);

    // 垃圾桶標籤文字
    noStroke();
    fill(255);
    textSize(15);
    textAlign(CENTER, CENTER);
    text(bucketX < width / 2 ? "資源回收桶" : "一般垃圾桶", bucketX, bucketY);
    pop();
}

// 繪製頂端與底端的 UI
function drawUI() {
    // 得分板
    fill(44, 62, 80);
    noStroke();
    textSize(24);
    textAlign(CENTER, TOP);
    text("目前教學挑戰得分: " + score, width / 2, 25);

    // 底部 AI 狀態回饋列
    rectMode(CENTER);
    fill(44, 62, 80, 220);
    rect(width / 2, height - 25, 360, 32, 16);

    fill(255);
    textSize(13);
    textAlign(CENTER, CENTER);
    text("AI 辨識反饋: " + currentGesture, width / 2, height - 25);
}