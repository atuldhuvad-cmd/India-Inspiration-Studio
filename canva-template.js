// Local Canva-inspired composition. Artwork is bundled; no Canva account is required.
const CANVA_PHOTOS = {};
function canvaArtDirection(title) {
  const t = title.toLowerCase();
  let asset = 'community', tone = 'cream';
  if (/new year.s eve|new year's day/.test(t)) { asset='new-year-eve'; tone='navy'; }
  else if (/christmas/.test(t)) { asset='christmas'; tone='navy'; }
  else if (/gandhi|character|integrity|anti-corruption/.test(t)) asset='gandhi';
  else if (/vagh baras/.test(t)) asset='vagh-baras';
  else if (/govardhan|annakut/.test(t)) {asset='annakut';tone='green';}
  else if (/bestu|gujarati new year/.test(t)) {asset='gujarati-new-year';tone='burgundy';}
  else if (/rose/.test(t)) asset='rose';
  else if (/service|kindness|food|jalaram/.test(t)) asset='service';
  else if (/learning|literacy|teacher|student|hindi|engineer/.test(t)) asset='theme-wisdom';
  else if (/patience|nature|environment|soil|ozone|cleanup|pollution|mountain|solstice/.test(t)) {asset='patience';tone='green';}
  else if (/courage|discipline|purpose|air force|armed forces|vijay/.test(t)) {asset='theme-courage';tone='navy';}
  else if (/peace|hope|suicide/.test(t)) {asset='theme-kindness';tone='navy';}
  else if (/diwali|dhanteras|chaudas|dussehra|ganesh/.test(t)) {asset='gujarati-new-year';tone='burgundy';}
  const colors = {
    cream:{bg:'#FBF0DC',ink:'#453429',accent:'#7C4236',gold:'#A67B3C'},
    green:{bg:'#F0F0DE',ink:'#253F34',accent:'#315F4E',gold:'#A67B3C'},
    navy:{bg:'#102536',ink:'#FFF0D6',accent:'#F1D29A',gold:'#D6AC67'},
    burgundy:{bg:'#4B1727',ink:'#FFF0D6',accent:'#F1D29A',gold:'#D6AC67'}
  };
  return {asset,src:asset.startsWith('theme-')?'artwork/BuiltIn/'+asset+'.jpg':'artwork/Canva/'+asset+'.png',...colors[tone]};
}
function canvaPhoto(src) {
  if (!CANVA_PHOTOS[src]) {
    const img=new Image(); CANVA_PHOTOS[src]=img;
    img.onload=()=>{if(rec && $('style').value==='Canva')render();};
    img.onerror=()=>{img.failed=true;if(rec && $('style').value==='Canva')render();};
    img.src=src;
  }
  return CANVA_PHOTOS[src];
}
function canvaText(text,width,maxHeight,startSize,minSize,weight='400',family='Georgia,serif') {
  let lines=[],size=startSize,lh;
  for(;size>=minSize;size-=2){
    ctx.font=weight+' '+size+'px '+family;lines=[];
    for(const para of String(text).split(/\n+/)){
      let line='';
      for(const word of para.trim().split(/\s+/)){
        const next=line?line+' '+word:word;
        if(ctx.measureText(next).width>width && line){lines.push(line);line=word;}else line=next;
      }
      if(line)lines.push(line);
    }
    lh=Math.ceil(size*1.23);
    if(lines.length*lh<=maxHeight && lines.every(l=>ctx.measureText(l).width<=width))break;
  }
  size=Math.max(size,minSize);lh=Math.ceil(size*1.23);ctx.font=weight+' '+size+'px '+family;
  return {lines,size,lh,height:lines.length*lh,ok:lines.length*lh<=maxHeight&&lines.every(l=>ctx.measureText(l).width<=width)};
}
function renderCanva() {
  const art=canvaArtDirection(themeTitle()), image=artworkImage||canvaPhoto(art.src);
  ctx.fillStyle=art.bg;ctx.fillRect(0,0,1080,1920);
  ctx.strokeStyle=art.gold;ctx.lineWidth=2;ctx.strokeRect(38,38,1004,1844);
  ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillStyle=art.accent;ctx.font='600 27px Georgia,serif';
  const daily=rec && rec.Record_Type==='Evergreen';
  ctx.fillText(daily?'A MOMENT FOR TODAY':'MARKING THE OCCASION',540,98);
  const title=canvaText(themeTitle(),884,300,94,48,'400');
  const titleY=186+(300-title.height)/2;
  ctx.fillStyle=art.accent;title.lines.forEach((l,i)=>ctx.fillText(l,540,titleY+i*title.lh));
  ctx.strokeStyle=art.gold;ctx.beginPath();ctx.moveTo(390,515);ctx.lineTo(690,515);ctx.stroke();
  ctx.save();ctx.translate(540,515);ctx.rotate(Math.PI/4);ctx.fillStyle=art.gold;ctx.fillRect(-7,-7,14,14);ctx.restore();
  const message=canvaText(currentEnglishMessage(),864,370,56,34);
  const messageY=570+(370-message.height)/2;
  ctx.fillStyle=art.ink;message.lines.forEach((l,i)=>ctx.fillText(l,540,messageY+i*message.lh));
  // Contain the whole photograph so hands, faces and sacred objects stay intact.
  const ready=image.complete&&image.naturalWidth>0;
  if(ready){
    const scale=Math.min(1000/image.naturalWidth,690/image.naturalHeight);
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    ctx.drawImage(image,540-w/2,1000+(690-h)/2,w,h);
  } else {
    ctx.fillStyle=art.ink;ctx.font='32px Georgia,serif';
    ctx.fillText(image.failed?'Artwork unavailable — choose a local image':'Loading artwork…',540,1310);
  }
  ctx.strokeStyle=art.gold;ctx.beginPath();ctx.moveTo(300,1730);ctx.lineTo(780,1730);ctx.stroke();
  ctx.fillStyle=art.ink;ctx.font='500 38px Georgia,serif';
  const date=new Date($('date').value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
  ctx.fillText(date,540,1763);
  const sig=canvaText(sigName(),850,48,34,24,'italic');
  ctx.fillStyle=art.accent;ctx.fillText(sig.lines.join(' '),540,1812);
  window.__canvaMetrics={ready,ok:ready&&title.ok&&message.ok&&sig.ok,titleSize:title.size,messageSize:message.size,source:artworkImage?'local':art.src,titleBottom:titleY+title.height,messageBottom:messageY+message.height,date};
  ctx.textBaseline='alphabetic';
  return {en:{lines:message.lines,fontSize:message.size,totalHeight:message.height}};
}

function canvaDefaultMessage(record){return {"2026-09-08":"Literacy opens doors to knowledge, confidence and possibility. Help someone discover the joy of reading.","2026-09-22":"A rose can carry a simple message: you are cared for. Offer kindness and companionship to people affected by cancer.","2026-10-02":"Honour Gandhi through truth in our words, kindness in our actions and the courage to choose non-violence.","2026-11-05":"May Vagh Baras deepen our gratitude for the animals that nourish our lives. Let care be part of every celebration.","2026-11-09":"May the abundance of Annakut remind us to honour nature, give thanks for our food and share generously.","2026-12-24":"May this Christmas Eve bring peace to your home, warmth to your heart and time with those you love.","2026-12-31":"Close the year with gratitude. Welcome 2027 with hope, a generous heart and the courage to begin again."}[record.Date] || record.Message_English;}
