import{portraitHandler}from'./handler.js';
import{createPortraitAdapter}from'./supabase-adapter.js';
import{createGeminiPortraitGenerator}from'./gemini.js';
const services=createPortraitAdapter({url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
Deno.serve(portraitHandler({...services,generate:createGeminiPortraitGenerator({key:Deno.env.get('GEMINI_API_KEY')})}));
