const API='/api';
function getToken(){return localStorage.getItem('token')}
async function api(path,options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};const token=getToken();if(token)headers.Authorization=`Bearer ${token}`;const res=await fetch(API+path,{...options,headers});let data={};try{data=await res.json()}catch{}if(!res.ok){if(res.status===401){localStorage.clear(); if(!location.pathname.endsWith('login.html')&&!location.pathname.endsWith('admin-login.html')) location.href='/login.html'}throw new Error(data.message||'Request failed')}return data}
function msg(text,ok=false){const el=document.getElementById('msg');if(el)el.className=ok?'ok':'error',el.textContent=text}
function logout(){localStorage.clear();location.href='/login.html'}
function requireRole(role){const u=JSON.parse(localStorage.getItem('user')||'null');if(!u||u.role!==role){location.href=role==='ADMIN'?'/admin-login.html':'/login.html';return false}return true}
document.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('logout');if(b)b.onclick=logout});
