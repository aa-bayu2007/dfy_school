### # Implementation Plan: Push changes to dfy and fathan branches

### ## Approach
- Stage current unstaged and untracked changes (moving `KonfirmasiKehadiran.tsx` and adding `frontend/src/pages/siswa/`).
- Commit changes to `dfy` branch.
- Push `dfy` to `origin/dfy`.
- Merge `dfy` into `fathan` branch.
- Push `fathan` to `origin/fathan`.

### ## Steps
1. **Stage Changes** (2 min)
   ```bash
   git add .
   ```
2. **Commit Changes** (2 min)
   ```bash
   git commit -m "refactor: move KonfirmasiKehadiran to frontend/src/pages/siswa and cleanup"
   ```
3. **Push to dfy** (2 min)
   ```bash
   git push origin dfy
   ```
4. **Merge to fathan** (5 min)
   ```bash
   git checkout fathan
   git merge dfy
   ```
5. **Push to fathan** (2 min)
   ```bash
   git push origin fathan
   ```
6. **Cleanup/Switch Back** (1 min)
   ```bash
   git checkout dfy
   ```

### ## Timeline
| Phase | Duration |
|-------|----------|
| Staging | 2 min |
| Committing | 2 min |
| Pushing dfy | 2 min |
| Merging fathan| 5 min |
| Pushing fathan| 2 min |
| **Total** | **13 min** |

### ## Rollback Plan
- If merge fails, abort merge with `git merge --abort`.
- If push fails, investigate remote state.

### ## Security Checklist
- [x] Check for sensitive files (none found in untracked).
