#!/usr/bin/env node

// Simple script to check Redis status and provide helpful instructions
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if Docker is running
function checkDocker() {
  return new Promise((resolve) => {
    const docker = spawn('docker', ['ps'], { stdio: 'pipe' });
    docker.on('close', (code) => {
      resolve(code === 0);
    });
    docker.on('error', () => {
      resolve(false);
    });
  });
}

// Check if Redis container is running
function checkRedisContainer() {
  return new Promise((resolve) => {
    const docker = spawn('docker', ['ps', '--filter', 'name=codesense-redis', '--format', '{{.Names}}'], { stdio: 'pipe' });
    let output = '';
    docker.stdout.on('data', (data) => {
      output += data.toString();
    });
    docker.on('close', (code) => {
      resolve(code === 0 && output.includes('codesense-redis'));
    });
    docker.on('error', () => {
      resolve(false);
    });
  });
}

// Start Redis container using docker-compose
function startRedis() {
  return new Promise((resolve) => {
    console.log(' Starting Redis container using docker-compose...');
    
    const dockerCompose = spawn('docker-compose', ['up', '-d', 'redis'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    dockerCompose.on('close', (code) => {
      if (code === 0) {
        console.log('Redis container started successfully!');
        resolve(true);
      } else {
        console.log('❌ Failed to start Redis container');
        resolve(false);
      }
    });
  });
}

// Main function
async function main() {
  console.log(' Checking Redis connection status...\n');
  
  const dockerAvailable = await checkDocker();
  
  if (!dockerAvailable) {
    console.log(' Docker is not running or not available');
    console.log(' To fix this:');
    console.log('1. Start Docker Desktop');
    console.log('2. Run this script again');
    console.log('Alternatively, you can run without Redis (cache will be disabled)');
    return;
  }
  
  console.log('Docker is available');
  
  const redisRunning = await checkRedisContainer();
  
  if (redisRunning) {
    console.log(' Redis container is already running!');
    console.log('\n Your application should work normally with caching enabled');
  } else {
    console.log(' Redis container is not running');
    console.log('\nWould you like to start Redis? (Recommended for better performance)');
    
    // Try to start Redis automatically
    const started = await startRedis();
    
    if (started) {
      console.log('\n Redis is now running! Your application will have caching enabled');
      console.log('\n Note: It may take a few seconds for Redis to be fully ready');
    } else {
      console.log('\n  Could not start Redis automatically');
      console.log('\n Manual steps:');
      console.log('1. Make sure docker-compose.yml exists in your project root');
      console.log('2. Run: docker-compose up -d redis');
      console.log('\nAlternatively, your application will work without Redis (caching disabled)');
    }
  }
  
  console.log('\n📖 For more information, see: docker-compose.yml');
}

// Run the script
main().catch(console.error);
