---
title: "{{ replace .File.ContentBaseName "-" " " | title }}"
date: {{ .Date }}
draft: true
locations: []
years: ["{{ dateFormat "2006" now }}"]
cover:
  image: "cover.jpg"
  alt: ""
  relative: true
---
