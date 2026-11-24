# 09 · Roteiro do vídeo de demonstração (Etapa 11)

**Duração alvo:** 5 a 7 minutos · **Resolução:** 1080p · **Ferramenta sugerida:** OBS Studio (grátis) ou o gravador do próprio sistema.

**Antes de gravar**
- `npm run db:reset` no backend, para começar com dados limpos.
- Duas janelas lado a lado: **Operador** (esquerda) e **Administrador** (direita, outra janela anônima).
- Zoom do navegador em 110%, notificações do sistema desligadas.

| Tempo | Quem fala | O que mostrar | O que dizer (resumo) |
|---|---|---|---|
| 0:00–0:30 | Pessoa 1 | Logo + tela de login | Problema da SafeCash: duplicidade e falta de auditoria. O que construímos. |
| 0:30–1:15 | Pessoa 1 | Dashboard | Saldo, entradas, saídas, gráfico mensal, categorias. "Os valores são guardados em centavos." |
| 1:15–2:30 | Pessoa 2 | Operador lança **"Pagamento de Aluguel – R$ 2.000,00"** | Mostrar a máscara do valor. **Apontar a janela do admin: o saldo mudou sozinho.** (requisito H5) |
| 2:30–3:15 | Pessoa 2 | Tentar valor vazio e salvar | Erros por campo. No Swagger, enviar `"amount": "-50"` → 400. (validação de esquema) |
| 3:15–4:15 | Pessoa 3 | Excluir um lançamento com motivo | Confirmação, toast. Logar como **Auditor**, filtrar "Excluídas", abrir o **Histórico**: criou → editou → excluiu, com autor, horário e motivo. (Regra de Ouro, H1) |
| 4:15–4:45 | Pessoa 3 | Admin restaura | Saldo volta. Tela de Auditoria geral com logins. |
| 4:45–5:15 | Pessoa 4 | Celular (DevTools, modo dispositivo) | Menu inferior, tabela em cartões, formulário. (multiplataforma) |
| 5:15–6:00 | Pessoa 4 | VS Code + terminal | Estrutura de pastas, `npm test` passando, Swagger em `/api/docs`, CI verde no GitHub. |
| 6:00–6:45 | Pessoa 5 | Trello/GitHub Projects + PR com conflito resolvido | Sprints, divisão de tarefas, um merge conflict real resolvido. (H8, C10) |
| 6:45–7:00 | Todos | Tela final com URL e nomes | Agradecimento. |

**Publicar no GitHub**
- Vídeos até 10 MB: arraste o `.mp4` para a descrição de uma *Issue* ou *Release* do repositório, copie o link gerado e cole no README.
- Vídeos maiores: suba no YouTube como **não listado** e coloque o link no README:

```markdown
## 🎬 Demonstração
[![Assista à demonstração](docs/screenshots/dashboard.png)](https://youtu.be/SEU_VIDEO)
```
