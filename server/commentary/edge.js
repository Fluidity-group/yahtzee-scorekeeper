import {createLiveCommentaryEndpoint} from './endpoint.js';
Deno.serve(createLiveCommentaryEndpoint({env:Deno.env,fetchImpl:fetch,waitUntil:promise=>EdgeRuntime.waitUntil(promise)}));
