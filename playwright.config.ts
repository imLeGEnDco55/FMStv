import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:120000,workers:1,use:{baseURL:'http://127.0.0.1:5174',headless:true,launchOptions:{args:['--autoplay-policy=no-user-gesture-required']}},webServer:{command:'npm run dev -- --port 5174 --strictPort',url:'http://127.0.0.1:5174',reuseExistingServer:true}});
