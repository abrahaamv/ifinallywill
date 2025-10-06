# Quick Start Guide

> Get the AI Assistant Platform running locally in **under 10 minutes**.

---

## ⚡ Prerequisites

Ensure you have these installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** 9+ (`npm install -g pnpm`)
- **Python** 3.11+ ([Download](https://www.python.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))

---

## 🚀 5-Step Setup

### 1. Install Dependencies

```bash
# Clone the repository (if needed)
cd platform

# Install Node.js dependencies
pnpm install

# Set up Python AI agent
cd livekit-agent
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys (required for AI features)
# Minimum required:
# - DATABASE_URL (provided by Docker)
# - OPENAI_API_KEY (for AI features)
# - LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
```

### 3. Start Databases

```bash
# Start PostgreSQL and Redis
pnpm db:up

# Initialize database schema
pnpm db:push

# (Optional) Seed with sample data
pnpm db:seed
```

### 4. Start Development Servers

```bash
# Start all services (API, web, widget-sdk)
pnpm dev

# Services will be available at:
# - Landing: http://localhost:5173
# - Dashboard: http://localhost:5174
# - Meeting: http://localhost:5175
# - Widget SDK: http://localhost:5176
# - API Server: http://localhost:3001
```

### 5. Verify Setup

Open your browser:
- **Landing**: http://localhost:5173 (public marketing)
- **Dashboard**: http://localhost:5174 (admin portal)
- **Meeting**: http://localhost:5175 (meeting rooms)
- **Widget SDK**: http://localhost:5176 (embeddable widget)
- You should see all apps running!

---

## 🎯 Next Steps

### Build Your First Feature

1. **Review Architecture**: [System Design](../architecture/system-design.md)
2. **Follow Roadmap**: [Development Roadmap](../guides/roadmap.md)
3. **Implement APIs**: [API Reference](../reference/api.md)

### Explore Documentation

- **[Project Overview](overview.md)** - Understand the vision
- **[Tech Stack](../architecture/tech-stack.md)** - Learn the technologies
- **[Component Patterns](../guides/components.md)** - Build UI components

---

## 🔧 Common Issues

### Database Connection Error

```bash
# Ensure Docker is running
docker ps

# Restart databases
pnpm db:down
pnpm db:up
```

### Port Already in Use

```bash
# Kill process on specific port
# Port 5173 (web)
lsof -ti:5173 | xargs kill -9

# Port 3001 (api)
lsof -ti:3001 | xargs kill -9
```

### Python Virtual Environment Issues

```bash
# Recreate virtual environment
cd livekit-agent
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## 📚 Additional Resources

- **[Full Development Setup](development.md)** - Detailed setup guide
- **[Configuration Reference](../reference/configuration.md)** - All environment variables
- **[Testing Guide](../guides/testing.md)** - Run tests

---

## ✅ Checklist

- [ ] Node.js 20+ installed
- [ ] pnpm 9+ installed
- [ ] Python 3.11+ installed
- [ ] Docker Desktop running
- [ ] Dependencies installed (`pnpm install`)
- [ ] Python environment set up
- [ ] `.env` file configured
- [ ] Databases running (`pnpm db:up`)
- [ ] Schema initialized (`pnpm db:push`)
- [ ] Dev servers running (`pnpm dev`)
- [ ] Web app accessible at http://localhost:5173

---

**Next**: [Development Setup](development.md) for detailed configuration options.
