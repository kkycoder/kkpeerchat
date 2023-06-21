

const APP_ID = "5476cbe889ce41e2884ab426d55e8e8b";
//const roomID = "my-room-id";

let uid = String(Math.floor(Math.random() * 10000));
let token = null;

let client;
let channel;

let queryString  =window.location.search
let urlParms =new URLSearchParams(queryString)
let roomId = urlParms.get('room')

if(!roomId)
{
  window.location ='lobby.html'
}


let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: [
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ],
};

const init = async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    document.getElementById("user-1").srcObject = localStream;

    client = AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });

    channel = client.createChannel(roomId);
    await channel.join();

    channel.on("MemberJoined", handleUserJoined);

    channel.on('MeberLeft',handleUserLeft)

    client.on('MessageFromPeer',handleMessageFromPeer)

    
    
  } catch (error) {
    console.error(error);
  }
};

let handleUserLeft = (MemberId) =>{
  document.getElementById('user-2').style.display ='none'
  document.getElementById("user-1").classList.remove('smallFrame')

}

let handleMessageFromPeer = async(message,MemberId) =>{
  message=JSON.parse(message.text)

  if(message.type ==='offer'){
    createAnswer(MemberId,message.offer)
  }

  if(message.type ==='answer'){
    addAnswer(message.answer)
  }

  if(message.type ==='candidate'){
    if(peerConnection)
    {
      peerConnection.addIceCandidate(message.candidate)
    }
  }


}

const handleUserJoined = async (MemberId) => {
  console.log("A new user joined the channel:", MemberId);
  createOffer(MemberId);
};


let createPeerConnection = async(MemberId) =>{
  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  
  document.getElementById("user-2").style.display ='block'

  
  document.getElementById("user-1").classList.add('smallFrame')


   if(!localStream)
   {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    document.getElementById("user-1").srcObject = localStream;

   }

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      client.sendMessageToPeer({text:JSON.stringify({'type':'candidate','candidate':event.candidate})},MemberId)

    }
  };
}

const createOffer = async (MemberId) => {
  try {
   
    await createPeerConnection(MemberId)

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    

    client.sendMessageToPeer({text:JSON.stringify({'type':'offer','offer':offer})},MemberId)

    // Send the offer to the other peer using a signaling mechanism
    // ...

    // Once you receive the answer from the other peer, set it as the remote description
    // const answer = ...;
    // await peerConnection.setRemoteDescription(answer);
  } catch (error) {
    console.error(error);
  }
};

let createAnswer = async(MemberId,offer)=>{
await createPeerConnection(MemberId)

await peerConnection.setRemoteDescription(offer)

let answer = await peerConnection.createAnswer()
await peerConnection.setLocalDescription(answer)

client.sendMessageToPeer({text:JSON.stringify({'type':'answer','answer':answer})},MemberId)


}


let  addAnswer = async(answer) =>{
  if(!peerConnection.currentRemoteDescription){
    peerConnection.setRemoteDescription(answer)
  }
}

let leaveChannel = async() =>{
  await channel.leave()
  await client.logout()
}

let toggleCamera = async() =>{
  let videoTrack =localStream.getTracks().find(track =>track.kind==='video')

  if(videoTrack.enabled){
    videoTrack.enabled =false
    document.getElementById('camera-btn').style.backgroundColor ='rgb(255,80,80)'
  }
  else{
    videoTrack.enabled =true
    document.getElementById('camera-btn').style.backgroundColor='rgb(179,102,249,.9)'
  }
}


let toggleMic = async () => {
  let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')

  if(audioTrack.enabled){
      audioTrack.enabled = false
      document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  }else{
      audioTrack.enabled = true
      document.getElementById('mic-btn').style.backgroundColor = 'rgb(179, 102, 249, .9)'
  }
}


document.getElementById('camera-btn').addEventListener('click',toggleCamera)


window.addEventListener('beforeunload',leaveChannel)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
// document.querySelector('#camera-btn').addEventListener('click',toggleCamera)

init();