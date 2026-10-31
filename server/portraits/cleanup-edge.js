import{createPortraitAdapter}from'./supabase-adapter.js';
import{portraitCleanupHandler}from'./cleanup.js';
const {store,images,clips}=createPortraitAdapter({url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
Deno.serve(portraitCleanupHandler({store,images,clips,token:Deno.env.get('PORTRAIT_CLEANUP_TOKEN')}));
