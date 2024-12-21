const express = require('express');
const session = require('express-session');
const { Dropbox } = require('dropbox');
const fetch = require('node-fetch');
const { HfInference } = require('@huggingface/inference');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3003;

// Initialize Hugging Face client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Store active schedules and notifications in memory (for MVP)
const activeSchedules = new Map();
const notifications = new Map();
const pendingPosts = new Map();
const projectSeries = new Map();
const confirmationCounts = new Map();

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use(express.static('public'));
app.use(express.json());

// Facebook/Instagram configuration
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FB_REDIRECT_URI = `http://localhost:${port}/auth/facebook/callback`;

// Instagram configuration
const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID;
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const INSTAGRAM_REDIRECT_URI = `http://localhost:${port}/auth/instagram/callback`;

// Dropbox configuration
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const DROPBOX_REDIRECT_URI = `http://localhost:${port}/auth/dropbox/callback`;

// Function to check if automation is enabled
function isAutomationEnabled(sessionId) {
    return (confirmationCounts.get(sessionId) || 0) >= 3;
}

// Facebook auth routes
app.get('/auth/facebook', (req, res) => {
    const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts'
    ];
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        `&response_type=code`;
    
    res.redirect(authUrl);
});

app.get('/auth/facebook/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.redirect('/?error=' + encodeURIComponent(error));
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(
            'https://graph.facebook.com/v18.0/oauth/access_token?' +
            `client_id=${FACEBOOK_APP_ID}` +
            `&client_secret=${FACEBOOK_APP_SECRET}` +
            `&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}` +
            `&code=${code}`
        );
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            throw new Error(tokenData.error.message);
        }

        // Store the access token in session
        req.session.facebookToken = tokenData.access_token;
        
        res.redirect('/?facebook_success=true');
    } catch (error) {
        console.error('Facebook auth error:', error);
        res.redirect('/?error=' + encodeURIComponent(error.message));
    }
});

// Instagram auth routes
app.get('/auth/instagram', (req, res) => {
    const scopes = [
        'instagram_basic',
        'instagram_content_publish',
        'instagram_manage_insights'
    ];
    
    const authUrl = `https://api.instagram.com/oauth/authorize?` +
        `client_id=${INSTAGRAM_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(INSTAGRAM_REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(scopes.join(','))}` +
        `&response_type=code`;
    
    res.redirect(authUrl);
});

app.get('/auth/instagram/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.redirect('/?error=' + encodeURIComponent(error));
    }

    try {
        const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: INSTAGRAM_APP_ID,
                client_secret: INSTAGRAM_APP_SECRET,
                grant_type: 'authorization_code',
                redirect_uri: INSTAGRAM_REDIRECT_URI,
                code
            })
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
            throw new Error(tokenData.error.message);
        }

        // Store the access token and user ID in session
        req.session.instagramToken = tokenData.access_token;
        req.session.instagramUserId = tokenData.user_id;
        
        res.redirect('/?instagram_success=true');
    } catch (error) {
        console.error('Instagram auth error:', error);
        res.redirect('/?error=' + encodeURIComponent(error.message));
    }
});

// Instagram API routes
app.get('/api/instagram/accounts', async (req, res) => {
    if (!req.session.instagramToken) {
        return res.status(401).json({ error: 'Not authenticated with Instagram' });
    }

    try {
        const response = await fetch(
            `https://graph.instagram.com/me/accounts?access_token=${req.session.instagramToken}`
        );
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        res.json(data.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dropbox auth routes
app.get('/auth/dropbox', (req, res) => {
    const dbx = new Dropbox({ 
        clientId: DROPBOX_APP_KEY 
    });
    
    const authUrl = dbx.auth.getAuthenticationUrl(
        DROPBOX_REDIRECT_URI,
        null,
        'code',
        'offline',
        null,
        'none',
        false
    );
    
    res.redirect(authUrl);
});

app.get('/auth/dropbox/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        return res.redirect('/?error=' + encodeURIComponent(error));
    }

    try {
        const dbx = new Dropbox({ 
            clientId: DROPBOX_APP_KEY,
            clientSecret: DROPBOX_APP_SECRET 
        });

        const response = await dbx.auth.getAccessTokenFromCode(DROPBOX_REDIRECT_URI, code);
        
        // Store the access token in session
        req.session.dropboxToken = response.result.access_token;
        
        res.redirect('/?dropbox_success=true');
    } catch (error) {
        console.error('Dropbox auth error:', error);
        res.redirect('/?error=' + encodeURIComponent(error.message));
    }
});

// Dropbox API routes
app.get('/api/dropbox/list', async (req, res) => {
    if (!req.session.dropboxToken) {
        return res.status(401).json({ error: 'Not authenticated with Dropbox' });
    }

    try {
        const dbx = new Dropbox({ accessToken: req.session.dropboxToken });
        const path = req.query.path || '';
        
        const response = await dbx.filesListFolder({
            path: path,
            recursive: false,
            include_media_info: true
        });

        res.json(response.result);
    } catch (error) {
        console.error('Dropbox list error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/dropbox/preview', async (req, res) => {
    if (!req.session.dropboxToken) {
        return res.status(401).json({ error: 'Not authenticated with Dropbox' });
    }

    try {
        const dbx = new Dropbox({ accessToken: req.session.dropboxToken });
        const path = req.query.path;
        
        if (!path) {
            return res.status(400).json({ error: 'Path is required' });
        }

        // Get temporary link
        const response = await dbx.filesGetTemporaryLink({ path });
        res.json({ link: response.result.link });
    } catch (error) {
        console.error('Dropbox preview error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Facebook Pages
app.get('/api/facebook/pages', async (req, res) => {
    if (!req.session.facebookToken) {
        return res.status(401).json({ error: 'Not authenticated with Facebook' });
    }

    try {
        const response = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${req.session.facebookToken}`
        );
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        res.json(data.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Instagram Account for Page
app.get('/api/facebook/page/:pageId/instagram', async (req, res) => {
    if (!req.session.facebookToken) {
        return res.status(401).json({ error: 'Not authenticated with Facebook' });
    }

    try {
        const { pageId } = req.params;
        const page = req.session.fbPages.find(p => p.id === pageId);
        
        if (!page) {
            throw new Error('Page not found');
        }

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account{id,name,username}&access_token=${page.access_token}`
        );
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        res.json(data.instagram_business_account);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get remaining images count
app.get('/api/images/remaining', async (req, res) => {
    if (!req.session.dropboxToken) {
        return res.status(401).json({ error: 'Not authenticated with Dropbox' });
    }

    try {
        const dbx = new Dropbox({ accessToken: req.session.dropboxToken });
        const folderPath = req.session.selectedFolder;
        
        if (!folderPath) {
            return res.status(400).json({ error: 'No folder selected' });
        }

        const response = await dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_media_info: true
        });

        // Filter for image files that haven't been posted
        const postedImages = new Set(Array.from(activeSchedules.values())
            .flatMap(schedule => schedule.postedImages || []));

        const remainingImages = response.result.entries.filter(entry => 
            entry['.tag'] === 'file' && 
            /\.(jpg|jpeg|png)$/i.test(entry.name) &&
            !postedImages.has(entry.path_display)
        );

        res.json({ 
            count: remainingImages.length,
            images: remainingImages.map(img => ({
                path: img.path_display,
                name: img.name
            }))
        });
    } catch (error) {
        console.error('Error counting remaining images:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save selected folder
app.post('/api/folder/select', (req, res) => {
    const { path } = req.body;
    if (!path) {
        return res.status(400).json({ error: 'Path is required' });
    }
    
    req.session.selectedFolder = path;
    res.json({ success: true });
});

// Function to get the latest image from a Dropbox folder
async function getLatestImage(dropboxToken, folderPath) {
    const dbx = new Dropbox({ accessToken: dropboxToken });
    
    try {
        const result = await dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_media_info: true
        });

        // Filter for image files and sort by server_modified
        const images = result.result.entries
            .filter(entry => 
                entry['.tag'] === 'file' && 
                /\.(jpg|jpeg|png)$/i.test(entry.name)
            )
            .sort((a, b) => 
                new Date(b.server_modified) - new Date(a.server_modified)
            );

        if (images.length === 0) {
            throw new Error('No images found in folder');
        }

        // Get temporary link for the latest image
        const link = await dbx.filesGetTemporaryLink({ path: images[0].path_display });
        return {
            url: link.result.link,
            path: images[0].path_display
        };
    } catch (error) {
        console.error('Error getting latest image:', error);
        throw error;
    }
}

// Function to check if an image has been posted
function hasImageBeenPosted(imagePath, schedule) {
    return schedule.postedImages && schedule.postedImages.includes(imagePath);
}

// Function to count remaining unposted images
async function countRemainingImages(dropboxToken, folderPath, postedImages = []) {
    const dbx = new Dropbox({ accessToken: dropboxToken });
    
    try {
        const result = await dbx.filesListFolder({
            path: folderPath,
            recursive: false,
            include_media_info: true
        });

        const unpostedImages = result.result.entries
            .filter(entry => 
                entry['.tag'] === 'file' && 
                /\.(jpg|jpeg|png)$/i.test(entry.name) &&
                !postedImages.includes(entry.path_display)
            );

        return unpostedImages.length;
    } catch (error) {
        console.error('Error counting remaining images:', error);
        throw error;
    }
}

// Function to handle notifications
function addNotification(sessionId, type, message, level = 'info') {
    if (!notifications.has(sessionId)) {
        notifications.set(sessionId, []);
    }
    
    const notification = {
        id: Date.now(),
        type,
        message,
        level,
        timestamp: new Date().toISOString()
    };
    
    const userNotifications = notifications.get(sessionId);
    userNotifications.push(notification);
    
    // Keep only last 50 notifications
    if (userNotifications.length > 50) {
        userNotifications.shift();
    }
}

// Function to generate a post without publishing
async function generatePost(schedule, sessionId) {
    // Check remaining images
    const remainingImages = await countRemainingImages(
        schedule.dropboxToken, 
        schedule.dropboxFolder, 
        schedule.postedImages
    );

    if (remainingImages < 5) {
        addNotification(
            sessionId,
            'low_images',
            `Only ${remainingImages} unposted images remaining in folder`,
            'warning'
        );
    }

    if (remainingImages === 0) {
        addNotification(
            sessionId,
            'no_images',
            'No unposted images remaining in folder. Posting schedule paused.',
            'error'
        );
        return null;
    }

    // Get latest image
    const image = await getLatestImage(schedule.dropboxToken, schedule.dropboxFolder);
    
    // Check if image has already been posted
    if (hasImageBeenPosted(image.path, schedule)) {
        console.log('Image already posted:', image.path);
        return null;
    }

    // Generate caption
    const response = await fetch(`http://localhost:${port}/api/generate-caption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            imageUrl: image.url,
            style: schedule.style || 'professional'
        })
    });
    const { caption } = await response.json();

    return {
        imageUrl: image.url,
        imagePath: image.path,
        caption,
        pageId: schedule.pageId,
        instagramAccountId: schedule.instagramAccountId,
        timestamp: new Date().toISOString()
    };
}

// Function to execute the actual posting
async function executePost(schedule, sessionId, post = null) {
    try {
        if (!post) {
            post = await generatePost(schedule, sessionId);
            if (!post) return false;
        }

        // Post to Instagram
        const postResponse = await fetch(`http://localhost:${port}/api/instagram/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageUrl: post.imageUrl,
                caption: post.caption,
                pageId: post.pageId,
                instagramAccountId: post.instagramAccountId
            })
        });
        const postResult = await postResponse.json();

        if (postResult.error) {
            throw new Error(postResult.error);
        }

        // Update posted images list
        if (!schedule.postedImages) {
            schedule.postedImages = [];
        }
        schedule.postedImages.push(post.imagePath);

        addNotification(
            sessionId,
            'post_success',
            `Successfully posted image: ${post.imagePath}`,
            'success'
        );

        return true;
    } catch (error) {
        throw error;
    }
}

// Function to handle the actual posting process
async function handleScheduledPost(schedule, sessionId) {
    try {
        // Check if we need manual confirmation
        if (!isAutomationEnabled(sessionId)) {
            // Generate post but don't publish
            const post = await generatePost(schedule, sessionId);
            if (!post) return false;

            // Store for manual confirmation
            if (!pendingPosts.has(sessionId)) {
                pendingPosts.set(sessionId, []);
            }
            pendingPosts.get(sessionId).push(post);

            addNotification(
                sessionId,
                'pending_confirmation',
                'New post ready for review. Please confirm to publish.',
                'info'
            );
            return true;
        }

        // If automation is enabled, proceed with automatic posting
        return await executePost(schedule, sessionId);
    } catch (error) {
        console.error('Error in scheduled post:', error);
        addNotification(
            sessionId,
            'post_error',
            `Error handling post: ${error.message}`,
            'error'
        );
        return false;
    }
}

// Function to schedule multiple posts per day
function scheduleNextPosts(schedule, sessionId) {
    const now = new Date();
    const timeSlots = schedule.timeSlots.map(slot => {
        const [hours, minutes] = slot.split(':');
        let postTime = new Date(now);
        postTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        
        if (postTime <= now) {
            postTime.setDate(postTime.getDate() + 1);
        }

        return postTime;
    }).sort((a, b) => a - b);

    // Schedule all posts for the day
    const timeouts = timeSlots.map(postTime => {
        const delay = postTime.getTime() - now.getTime();
        
        return setTimeout(async () => {
            // Check if it's a valid posting day
            const dayOfWeek = postTime.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            if (schedule.frequency === 'weekdays' && isWeekend) {
                console.log('Skipping weekend post');
                return;
            }

            const success = await handleScheduledPost(schedule, sessionId);
            
            // If successful, schedule next day's post at this time
            if (success) {
                const nextDay = new Date(postTime);
                nextDay.setDate(nextDay.getDate() + 1);
                const nextDelay = nextDay.getTime() - new Date().getTime();
                
                scheduleNextPosts(schedule, sessionId);
            }
        }, delay);
    });

    return timeouts;
}

// Save schedule endpoint with automatic posting
app.post('/api/schedule/save', (req, res) => {
    const { timeSlots, frequency, dropboxFolder, pageId, instagramAccountId, style } = req.body;
    
    // Validate time slots
    if (!timeSlots || !Array.isArray(timeSlots) || timeSlots.length === 0) {
        return res.status(400).json({ error: 'At least one time slot is required' });
    }

    // Clear existing schedules if any
    if (activeSchedules.has(req.sessionID)) {
        activeSchedules.get(req.sessionID).forEach(clearTimeout);
    }

    // Create new schedule
    const schedule = {
        timeSlots,
        frequency,
        dropboxFolder,
        pageId,
        instagramAccountId,
        style,
        dropboxToken: req.session.dropboxToken,
        created: new Date().toISOString(),
        postedImages: []
    };

    // Store in session
    req.session.schedule = schedule;

    // Start scheduling
    const timeoutIds = scheduleNextPosts(schedule, req.sessionID);
    activeSchedules.set(req.sessionID, timeoutIds);
    
    res.json({ success: true, schedule: req.session.schedule });
});

// Get notifications endpoint
app.get('/api/notifications', (req, res) => {
    const userNotifications = notifications.get(req.sessionID) || [];
    res.json(userNotifications);
});

// Clear notifications endpoint
app.post('/api/notifications/clear', (req, res) => {
    notifications.set(req.sessionID, []);
    res.json({ success: true });
});

// Get pending posts endpoint
app.get('/api/pending-posts', (req, res) => {
    const posts = pendingPosts.get(req.sessionID) || [];
    res.json({
        posts,
        confirmationCount: confirmationCounts.get(req.sessionID) || 0,
        automationEnabled: isAutomationEnabled(req.sessionID)
    });
});

// Confirm post endpoint
app.post('/api/confirm-post', async (req, res) => {
    const { postIndex } = req.body;
    const posts = pendingPosts.get(req.sessionID);
    
    if (!posts || !posts[postIndex]) {
        return res.status(400).json({ error: 'Post not found' });
    }

    try {
        // Execute the post
        await executePost(req.session.schedule, req.sessionID, posts[postIndex]);

        // Update confirmation count
        const currentCount = confirmationCounts.get(req.sessionID) || 0;
        confirmationCounts.set(req.sessionID, currentCount + 1);

        // Remove the confirmed post
        posts.splice(postIndex, 1);

        // If automation is now enabled, notify the user
        if (isAutomationEnabled(req.sessionID)) {
            addNotification(
                req.sessionID,
                'automation_enabled',
                'You have confirmed 3 posts. Automatic posting is now enabled!',
                'success'
            );
        }

        res.json({ 
            success: true, 
            confirmationCount: currentCount + 1,
            automationEnabled: isAutomationEnabled(req.sessionID)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reject post endpoint
app.post('/api/reject-post', (req, res) => {
    const { postIndex } = req.body;
    const posts = pendingPosts.get(req.sessionID);
    
    if (!posts || !posts[postIndex]) {
        return res.status(400).json({ error: 'Post not found' });
    }

    // Remove the rejected post
    posts.splice(postIndex, 1);
    res.json({ success: true });
});

// Edit post endpoint
app.post('/api/edit-post', async (req, res) => {
    const { postIndex, caption, feedback } = req.body;
    const posts = pendingPosts.get(req.sessionID);
    
    if (!posts || !posts[postIndex]) {
        return res.status(400).json({ error: 'Post not found' });
    }

    try {
        if (feedback) {
            // Generate new caption based on feedback
            const response = await fetch(`http://localhost:${port}/api/generate-caption`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: posts[postIndex].imageUrl,
                    style: posts[postIndex].style,
                    feedback
                })
            });
            const data = await response.json();
            posts[postIndex].caption = data.caption;
        } else {
            // Use manually edited caption
            posts[postIndex].caption = caption;
        }

        // Add edit history if not exists
        if (!posts[postIndex].editHistory) {
            posts[postIndex].editHistory = [];
        }

        // Record this edit
        posts[postIndex].editHistory.push({
            timestamp: new Date().toISOString(),
            type: feedback ? 'ai_regenerate' : 'manual_edit',
            feedback,
            previousCaption: posts[postIndex].caption
        });

        res.json({ success: true, post: posts[postIndex] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add project series endpoint
app.post('/api/project-series', (req, res) => {
    const { template, currentNumber, enabled } = req.body;
    
    projectSeries.set(req.sessionID, {
        template,
        currentNumber: parseInt(currentNumber) || 1,
        enabled: enabled || false
    });

    res.json({ success: true });
});

// Get project series settings
app.get('/api/project-series', (req, res) => {
    const settings = projectSeries.get(req.sessionID) || {
        template: '',
        currentNumber: 1,
        enabled: false
    };
    res.json(settings);
});

// Caption generation endpoint
app.post('/api/generate-caption', async (req, res) => {
    const { imageUrl, style } = req.body;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
    }

    try {
        // Download image from Dropbox URL
        const response = await fetch(imageUrl);
        const imageBuffer = await response.buffer();

        // Generate caption using Hugging Face
        const result = await hf.imageToText({
            data: imageBuffer,
            model: "Salesforce/blip-image-captioning-large"
        });

        // Style templates with emojis
        const styles = {
            professional: (base) => `📸 Professional shot: ${base}\n\n#photography #professional #quality`,
            artistic: (base) => `🎨 Artistic vision: ${base}\n\n#art #creative #inspiration`,
            casual: (base) => `✨ Just vibing: ${base}\n\n#lifestyle #casual #vibes`,
            minimal: (base) => `⚪ ${base}\n\n#minimal #clean #simple`,
            storytelling: (base) => `📖 Story time: ${base}\n\n#story #moment #life`,
            technical: (base) => `💻 Technical details: ${base}\n\n#tech #details #specs`
        };

        // Apply selected style
        const caption = styles[style](result.generated_text);
        res.json({ caption });
    } catch (error) {
        console.error('Caption generation error:', error);
        res.status(500).json({ error: 'Error generating caption' });
    }
});

// Instagram posting endpoint
app.post('/api/instagram/post', async (req, res) => {
    const { imageUrl, caption, pageId, instagramAccountId } = req.body;

    if (!imageUrl || !caption || !pageId || !instagramAccountId) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const page = req.session.fbPages.find(p => p.id === pageId);
        if (!page) {
            throw new Error('Page not found');
        }

        // Create container
        const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${page.access_token}`,
            { method: 'POST' }
        );
        const containerData = await containerResponse.json();

        if (containerData.error) {
            throw new Error(containerData.error.message);
        }

        // Publish
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish?creation_id=${containerData.id}&access_token=${page.access_token}`,
            { method: 'POST' }
        );
        const publishData = await publishResponse.json();

        if (publishData.error) {
            throw new Error(publishData.error.message);
        }

        res.json({ success: true, postId: publishData.id });
    } catch (error) {
        console.error('Instagram post error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/schedule', (req, res) => {
    res.json(req.session.schedule || null);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
