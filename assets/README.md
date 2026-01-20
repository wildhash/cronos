# Assets Directory

This directory contains visual assets for the README and documentation.

## TODO: Add Screenshots

### Required Screenshots

1. **demo-terminal.png**
   - Terminal output from `npm run demo`
   - Should show:
     - Services starting (Seller API, Dashboard)
     - Buyer agent receiving 402
     - Payment signing and settlement
     - Success banner with txHash
     - Explorer link

2. **demo-dashboard.png**
   - Dashboard UI at `http://localhost:3000`
   - Should show:
     - Payment receipts list
     - Explorer links for txHash
     - Network info
     - Recent payments table

3. **sla-breach.png** (Optional)
   - Terminal output from `npm run demo:sla`
   - Should show:
     - SLA breach detection message
     - Refund tier triggered
     - Breach metrics (latency/uptime)

## Creating Screenshots

### For Terminal Screenshots
```bash
# Run the demo
npm run demo

# Capture the terminal output with:
# - macOS: Cmd+Shift+3 or Cmd+Shift+4
# - Linux: Screenshot tool or `scrot`
# - Windows: Snipping Tool

# Save as: assets/demo-terminal.png
```

### For Dashboard Screenshots
```bash
# Start the demo
npm run demo

# Open browser to http://localhost:3000
# Capture the dashboard showing:
# - Payment history
# - Explorer links
# - Network stats

# Save as: assets/demo-dashboard.png
```

## Image Requirements
- **Format**: PNG
- **Resolution**: At least 1920x1080 (can be higher)
- **Content**: Should clearly show the functionality
- **Quality**: High-quality, readable text

Once added, uncomment the image lines in README.md:
```markdown
![Terminal Demo](./assets/demo-terminal.png)
![Dashboard UI](./assets/demo-dashboard.png)
```
