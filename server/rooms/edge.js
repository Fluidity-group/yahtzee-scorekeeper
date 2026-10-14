import {roomHandler} from './handler.js';
import {createSupabaseRoomAdapter} from './supabase-adapter.js';

const {store,authenticate}=createSupabaseRoomAdapter({url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>alphabet[v%32]).join('');
Deno.serve(roomHandler({store,authenticate,randomCode}));
