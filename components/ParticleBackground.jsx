'use client';

import React, { useEffect, useRef, useState } from 'react';

const ParticleBackground = () => {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameId = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle initial mounting and theme detection
  useEffect(() => {
    setMounted(true);
    
    // Check if dark mode is active
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(darkModeQuery.matches);
      
      // Listen for theme changes
      const handleThemeChange = (e) => {
        setIsDarkMode(e.matches);
      };
      
      darkModeQuery.addEventListener('change', handleThemeChange);
      return () => {
        darkModeQuery.removeEventListener('change', handleThemeChange);
      };
    }
  }, []);

  // Setup canvas and animation
  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Particle class definition
    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3 + 1;
        this.originalSize = this.size;
        this.speedY = Math.random() * 0.5 + 0.1;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
        
        // Choose appropriate colors based on theme
        if (isDarkMode) {
          // Brighter colors for dark mode
          const hue = Math.random() * 60 + 180;
          const saturation = Math.random() * 40 + 50;
          const lightness = Math.random() * 30 + 60;
          this.color = `hsla(${hue}, ${saturation}%, ${lightness}%, ${this.opacity + 0.2})`;
        } else {
          // Darker colors for light mode
          const hue = Math.random() * 60 + 210;
          const saturation = Math.random() * 30 + 20;
          const lightness = Math.random() * 30 + 30;
          this.color = `hsla(${hue}, ${saturation}%, ${lightness}%, ${this.opacity})`;
        }
        
        // Pulsing effect properties
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
        this.pulseAmount = Math.random() * 0.5 + 0.5;
        this.pulseOffset = Math.random() * Math.PI * 2;
      }
      
      update() {
        // Move particle
        this.y += this.speedY;
        this.x += this.speedX;
        
        // Pulse effect
        const pulse = Math.sin(Date.now() * this.pulseSpeed * 0.001 + this.pulseOffset) * this.pulseAmount;
        this.size = this.originalSize + pulse * 0.3;
        
        // Reset particles that go off-screen
        if (this.y > height) {
          this.y = 0;
          this.x = Math.random() * width;
        }
        
        if (this.x < 0) {
          this.x = width;
        } else if (this.x > width) {
          this.x = 0;
        }
      }
      
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }
    
    // Create particles
    const initParticles = () => {
      particlesRef.current = [];
      const particleCount = Math.min(Math.floor(width * height / 8000), 150);
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(new Particle());
      }
    };
    
    // Mouse interaction handler
    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const radius = 100;
      
      particlesRef.current.forEach(particle => {
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < radius) {
          const force = (radius - distance) / radius;
          particle.x -= dx * force * 0.03;
          particle.y -= dy * force * 0.03;
        }
      });
    };
    
    // Animation loop
    const animate = () => {
      // Create trail effect with semi-transparent clear
      ctx.fillStyle = isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      // Update and draw particles
      particlesRef.current.forEach(particle => {
        particle.update();
        particle.draw();
      });
      
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    // Handle window resizing
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };
    
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Initialize and start animation
    initParticles();
    animate();
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isDarkMode, mounted]); // Re-run when dark mode changes

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.7 }}
      aria-hidden="true"
    />
  );
};

export default ParticleBackground;