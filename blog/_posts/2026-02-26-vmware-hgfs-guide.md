---
title: "VMware HGFS Quick Mount / Eject Helper"
date: 2026-02-26
description: "Clean Bash helpers to easily mount and unmount VMware Host Shared Folders using `vmhgfs-fuse`."
---

## 📌 Prerequisites

Install VMware tools inside the guest:

```bash
sudo apt install open-vm-tools open-vm-tools-desktop
```

Verify:
```bash
which vmhgfs-fuse
```

Make sure:

* Shared folder is enabled in VMware settings
* Folder name is known (example: `Projects`)

---

## 📂 Mount Location

All shared folders will be mounted inside:

```
/mnt-hgfs/<dir-name>
```

## 🧠 Add This To `~/.bashrc` or `~/.zshrc`

```bash
# Function to mount Host shared folder
mount_hgfs() {
    if mountpoint -q /mnt-hgfs/<dir-name>; then
        echo "[!] <dir-name> is already mounted. Moving into it..."
    else
        echo "[~] Mounting <dir-name>..."
        sudo mount -t fuse.vmhgfs-fuse .host:/<dir-name> /mnt-hgfs/<dir-name> \
        -o allow_other,uid=1000,gid=1000
        if [ $? -eq 0 ]; then
            echo "[OK] <dir-name> mounted successfully."
        else
            echo "[ERROR] Failed to mount <dir-name>."
            return 1
        fi
    fi
    cd /mnt-hgfs/<dir-name>
}

# Function to unmount Host shared folder
eject_hgfs() {
    if ! mountpoint -q /mnt-hgfs/<dir-name>; then
        echo "[INFO] <dir-name> is not mounted."
        return 0
    fi
    # Move out if currently inside the folder
    if [ "$(pwd)" = "/mnt-hgfs/<dir-name>" ] || [[ "$(pwd)" == /mnt-hgfs/<dir-name>/* ]]; then
        cd ~
    fi
    echo "[~] Unmounting <dir-name>..."
    sudo umount /mnt-hgfs/<dir-name>
    if [ $? -eq 0 ]; then
        echo "[OK] <dir-name> unmounted successfully."
    else
        echo "[ERROR] Failed to unmount <dir-name>. Directory might be busy."
    fi
}

# Aliases for hyphen-style commands
alias mount-<dir-name>='mount_hgfs'
alias eject-<dir-name>='eject_hgfs'
```

## 🔁 Reload Shell

```bash
source ~/.bashrc
```

---

## 🚀 Usage

### 🔹 Mount Shared Folder

```bash
mount-<dir-name>
```

✔ Mounts folder
✔ Automatically moves into it

### 🔹 Unmount Shared Folder

```bash
eject-<dir-name>
```

✔ Safely exits directory if inside
✔ Unmounts shared folder

---

## 🛠 Replace `<dir-name>`

Replace every occurrence of:

```
<dir-name>
```

With your actual VMware shared folder name.

Example:

If shared folder name is:

```
Projects
```

Replace `<dir-name>` → `Projects` everywhere.

---

## 📁 If Directory Doesn't Exist

Create it first:

```bash
sudo mkdir -p /mnt-hgfs/<dir-name>
```

---

## ❌ Common Errors

### `Device is busy`

Some process is using the folder.

Check:

```bash
lsof +D /mnt-hgfs/<dir-name>
```

---

## 🔎 Manual Mount (Reference)

```bash
sudo mount -t fuse.vmhgfs-fuse .host:/Projects /mnt-hgfs/Projects \
-o allow_other,uid=1000,gid=1000
```

---

## 🎯 Why Use This?

* No long mount commands
* Clean workflow
* Fast host ↔ guest file sharing
* Good for dev environments
* Minimal typing

---
