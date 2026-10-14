import {openingFacts} from '../../src/commentary/opening-facts.js';
import {roomHandler} from './handler.js';
import {createSupabaseRoomAdapter} from './supabase-adapter.js';

const {store,authenticate}=createSupabaseRoomAdapter({url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),commentaryScopeId:'d1ce0000-0000-4000-8000-000000000026'});
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>alphabet[v%32]).join('');
Deno.serve(roomHandler({store,authenticate,randomCode,commentary:{openingFacts}}));

