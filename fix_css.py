import re

with open('style.css', 'r', encoding='utf-8') as f:
    content = f.read()

target = """.modal-field {
  display: flex;
  align-items: center;
}"""

replacement = """.modal-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text);
}

.modal-input-wrap {
  display: flex;
  align-items: center;
  gap: 2px;
}

.mini-number-input {
  width: 50px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 0.84rem;
  text-align: center;
  font-family: inherit;
}

.modal-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--text);
  cursor: pointer;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

.btn-secondary {
  background: #f1f3f5;
  border: 1px solid var(--line);
  color: var(--text-dim);
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
}

.btn-secondary:hover {
  background: #e9ecef;
  color: var(--text);
}"""

new_content = content.replace(target, replacement)

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(new_content)
