**Docker Database Management Cheatsheet**

---

**1. Normal Start / Up**

Starts the container in the background without affecting already written records.

```bash
docker compose up -d db
```

---

**2. Stop Container**

* **Stop and remove container:**
```bash
docker compose down db
```


* **Pause container only:**
```bash
docker compose stop db
```

---

**3. Full Fresh Start (Wipes Data & Re-runs Inits)**
```bash
docker compose down -v db
docker compose up -d db
```

---

**4. Rollback / Down**

* **Windows (PowerShell):**
```powershell
.\db-rollback
```
