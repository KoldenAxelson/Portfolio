---
# ── Page front matter ────────────────────────────────────────────────────────
# NOTES FROM VIDEOS, built to private/skills/VideoNotesPageMake.md. The page
# for keeping a self-hosted server safe; new videos on hardening, self-hosting
# or locking down an AI agent's box fold in here.
#
# youtube : the skit, as the flag. Its presence marks the card at /misc/
#           (layouts/misc/list.html) and ships the widget assets
#           (partials/video-notes/assets.html). Every link out is under Source.
# prose   : Tailwind Typography. Every widget root carries `not-prose`.
#
# The widget is a shortcode in layouts/shortcodes/vps-protection/, styled by
# css/pages/vps-protection/vps-protection.css on top of the shared video-notes
# box, with behaviour lazy-loaded from static/js/vps-protection/.
# ─────────────────────────────────────────────────────────────────────────────
title: "VPS Protection"
description: "Notes on a comedy skit about installing OpenClaw on a VPS, in which a security expert walks an AI bro through hardening a fresh Linux server: SSH keys, a firewall, fail2ban, automatic updates, Tailscale, and only then the app. With the order as a puzzle and the commands for Ubuntu."
# Blank by default — uncomment to put a line under the H1 in the banner.
#lead: "Lock the doors before you move in."
blurb: "A skit about an AI bro installing OpenClaw on a VPS turns out to be the best server-hardening guide I've seen. The steps, the order, the commands."
icon: "shield-check"
prose: true
youtube: "https://youtu.be/40SnEd1RWUU"
glossary: "servers"
---

Running servers is my job, so I didn't expect a comedy skit about one to be the
clearest hardening walkthrough I've watched. It is, mostly because every step
comes with someone asking "why?" and the answer is funnier than it should be.

These are my notes on Kai Lentit's skit, turned back into the guide it's hiding. The
steps and their order are the video's; the commands at the end and the asides
where I'd argue with the whiteboard are mine. One idea holds it together: lock
the doors before you move in, in an order that never locks you out.

## The cast

The AI bro wants to install {{< term "openclaw" >}}OpenClaw{{< /term >}} and
have a personal AI assistant by lunch. His plan was to buy a Mac mini. He uses
one password everywhere, and he wasn't paying attention when the key got made.

The security expert stands at a whiteboard drawn like a summoning circle:
firewall, private VPN, systemd, a ring of credentials. He tells the bro to use a
fresh Linux {{< term "vps" >}}VPS{{< /term >}}, "like what everybody does", then
spends the rest of the video showing it is neither one click nor something to do
lightly. Near the end the bro says "Claude, give me a new agent", and you realise
the expert was an AI agent the whole time.

## Twelve seconds

The bro rents a small box (one vCPU, 4 GB of RAM, a 100 GB drive) and gets a
public IP with root {{< term "ssh" >}}SSH{{< /term >}} access. Before he has
even logged in, they're under attack: the SSH scans started twelve seconds ago.

That gives the rule everything else hangs on: install nothing until root SSH is
secured. Twelve seconds is the skit's number, but the point holds. A public IP
gets knocked on by bots from the moment it boots, and a default server answers
with a password prompt for root.

## Order is the whole job

Most of the steps are easy. The order is what bites, because three of them can
lock you out of your own server, and the expert's answer to that is "We start
from scratch." Here are the skit's steps, scrambled. Find an order that works.

{{< vps-protection/order >}}

## Patch, tools, a user and a key

First `apt update` and `apt upgrade`, then the tools: curl, wget,
{{< term "ufw" >}}UFW{{< /term >}}, {{< term "fail2ban" >}}fail2ban{{< /term >}},
ca-certificates, gnupg and unattended-upgrades. The bro asks why none of this
ships by default. Linux, says the expert, was designed to be composable,
transparent, minimal, scalable and reusable in millions of environments, and it
was not designed to be secure. Secure for what?

Next comes a non-root user with a strong password, then an
{{< term "ssh-key" >}}SSH key{{< /term >}}, then password logins switched off.
The bro protests that he can't use the password he uses everywhere, which is
the point. Check the SSH config before you log out, restart with it, and log
back in with the key. The bro didn't save his key, so they start again.

## A firewall, as an elimination diet

Block everything, then slowly reintroduce what you really need. All unsolicited
traffic is denied except one {{< term "port" >}}port{{< /term >}}, 2222, for
SSH. Why 2222? It's arbitrary, you could choose any. The bro offers 67 and is
told the standard for arbitrary numbers is 2222.

Where I'd add a footnote: moving SSH off 22 mostly cuts the noise in your logs.
The keys do the actual protecting.

Then fail2ban, to auto-ban IPs that guess passwords, with its SSH jail pointed
at the new port. The bro points out they don't use passwords anymore. "Well,
that's today. But what about tomorrow?"

## Updates that run while you sleep

The bro runs `ls -la` a hundred times and announces he won't get hacked. The
expert attacks the server on the spot, because nobody turned on automatic
security updates or made sure the security origin is set. With
{{< term "unattended-upgrades" >}}unattended-upgrades{{< /term >}} configured,
the server patches itself and can reboot itself at 3:00 a.m. Then some basic OS
sanity, starting with a properly set time and date.

## Leaving the public internet

This is the part I'd keep if I skipped everything else. Install a private VPN
mesh ({{< term "tailscale" >}}Tailscale{{< /term >}} in the skit), check the
tunnel actually opens, then allow SSH on 2222 only over the mesh. Public SSH is
gone, and nothing on the open internet can reach the box.

The skit then disables IPv6 in UFW and applies kernel settings, "just so we can
sleep better." Here I'd argue with the whiteboard a little. UFW applies your
rules to IPv6 too by default, and switching IPv6 off in UFW alone leaves it
unfiltered. Turn it off in the kernel as well, as they do, or leave both on.

## Then, finally, the app

Only now does the install start. NodeJS comes from
the official repo, because "we never trust Node version distros." The app comes
straight from GitHub, which fails because Git isn't installed. Verifying the
repo isn't compromised means trusting GitHub and 900 random npm dependencies,
the funniest true sentence in the video.

The rest is housekeeping with opinions attached. Credentials get their own
directory with fixed permissions ("broken is the de facto standard"). A
{{< term "systemd" >}}systemd{{< /term >}} unit keeps the app running, after a
rant about systemd growing from an init system into a scheduler, debugger,
login manager and device manager, and the holdouts on other init systems ("we
don't talk to these people"). Then logging, disk protection, backups, and the
app's own security audit if it has one. Didn't they do security already? No,
says the expert: security needs to live rent free in your mind at all times.

## Where it lands

All of that buys a server with no public SSH and no public web ports, reachable
only over Tailscale, with 98.1% uptime if you ignore the weekly kernel panics.
The agent on it can still delete your Gmail, leak your Ethereum wallet, or join
online calls when someone messages commands to your Telegram bot. Hardening the
box doesn't limit what you've let the agent do, and that part is your next job.

Then the bro asks which VPS the expert runs his on. "Oh, I'm just running it on
an isolated Mac mini," the plan the bro walked in with. He asks for a new agent,
which offers to do it all on AWS EC2, right after security groups, network
access control lists and a quick introduction to Kubernetes.

## The checklist

The skit's order, with the commands I'd use on Ubuntu 24.04. Keep your current
session open until a new one works on every step that touches SSH.

```bash
# 1. Patch, then the tools the skit lists
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget ufw fail2ban ca-certificates gnupg unattended-upgrades

# 2. A non-root user (on the server, as root)
adduser konrad && usermod -aG sudo konrad
# from your laptop: copy your key, then log in with it before going on
ssh-copy-id konrad@SERVER_IP

# 3. Harden SSH in /etc/ssh/sshd_config.d/10-hardening.conf. The 10- sorts
#    before cloud-init's 50- file, and sshd keeps the first value it reads.
#      Port 2222
#      PermitRootLogin no
#      PasswordAuthentication no
#      KbdInteractiveAuthentication no
sudo sshd -t                                   # silence means it parses
sudo systemctl daemon-reload && sudo systemctl restart ssh.socket
# then, in a second terminal: ssh -p 2222 konrad@SERVER_IP

# 4. Firewall: deny everything, reintroduce SSH
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow 2222/tcp && sudo ufw enable

# 5. fail2ban: in /etc/fail2ban/jail.local
#      [sshd]
#      enabled = true
#      port = 2222
sudo systemctl restart fail2ban && sudo fail2ban-client status sshd

# 6. Automatic security updates, and the 3 a.m. reboot
sudo dpkg-reconfigure -plow unattended-upgrades
#    in /etc/apt/apt.conf.d/50unattended-upgrades:
#      Unattended-Upgrade::Automatic-Reboot "true";
#      Unattended-Upgrade::Automatic-Reboot-Time "03:00";
timedatectl                                    # "System clock synchronized: yes"

# 7. Tailscale, then close public SSH
curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up
tailscale ip -4                                # ssh to this from your laptop first
sudo ufw allow in on tailscale0 to any port 2222 proto tcp
sudo ufw delete allow 2222/tcp
```

After that comes the app, and then the harder question of what it's allowed to
touch.

## Source

One video, watched in October 2026. Everything above is a synthesis of the
skit, not independent research. The twelve seconds and the 98.1% are its
numbers. The captions mangle a few names, so I've left out the specific
alternative init systems and what the bro wanted to bet on. The commands are
mine and assume Ubuntu 24.04, where SSH is socket activated; on older releases
restart `ssh` instead of `ssh.socket`.

- [*"Just use a VPS bro" (OpenClaw version)*](https://youtu.be/40SnEd1RWUU),
  Kai Lentit, February 2026: the steps, their order, and every quote on this
  page.
