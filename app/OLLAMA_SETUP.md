# Настройка Ollama для LeetCode Solver

Приложение теперь использует локальный Ollama вместо удаленного DeepSeek API.

## Установка Ollama

### macOS

```bash
brew install ollama
```

### Linux

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows

Скачайте установщик с [ollama.com](https://ollama.com)

## Запуск Ollama

1. Запустите Ollama сервер (в отдельном терминале):

```bash
ollama serve
```

2. Установите модель deepseek-coder:

```bash
ollama pull deepseek-coder:6.7b
```

3. Проверьте, что Ollama работает:

```bash
curl http://localhost:11434/api/tags
```

## Использование приложения

1. Убедитесь, что Ollama запущен (`ollama serve`)
2. Запустите приложение: `npm start`
3. Нажмите "Start Session" - API ключ больше не нужен!
4. Отправляйте задачи LeetCode в текстовом формате

## Доступные модели

Вы можете использовать другие модели, указав их в localStorage:

-   `deepseek-coder:6.7b` (рекомендуется для кода)
-   `codellama:7b`
-   `llama3.2:3b`

Чтобы изменить модель, выполните в консоли браузера:

```javascript
localStorage.setItem('ollamaModel', 'codellama:7b');
```

## Формат запросов

Приложение автоматически использует промпт для LeetCode, который запрашивает:

1. Решение на Python с комментариями
2. Анализ сложности O()
3. Объяснение алгоритма
4. Тестовые случаи

## Устранение проблем

**Ошибка: "Ollama server is not available"**

-   Убедитесь, что `ollama serve` запущен
-   Проверьте, что порт 11434 не занят

**Ошибка: "Model not found"**

-   Выполните: `ollama pull deepseek-coder:6.7b`
-   Или используйте другую модель из списка доступных

**Проверка доступных моделей:**

```bash
ollama list
```
