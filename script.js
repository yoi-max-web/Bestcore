const h=document.getElementById('top'),b=document.getElementById('burger'),d=document.getElementById('drawer');
const onScroll=()=>h.classList.toggle('scrolled',window.scrollY>10);
onScroll();addEventListener('scroll',onScroll,{passive:true});
b.addEventListener('click',()=>{const o=d.classList.toggle('open');b.setAttribute('aria-expanded',o)});
d.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{d.classList.remove('open');b.setAttribute('aria-expanded',false)}));
document.getElementById('y').textContent=new Date().getFullYear();