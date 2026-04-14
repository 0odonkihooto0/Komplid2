'use client';

import { useState } from 'react';
import { ProblemIssueStatus } from '@prisma/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/utils/format';
import { QUESTION_TYPE_LABELS } from './ProblematicQuestionsView';
import {
  useQuestionDetail, useUpdateQuestion, useDeleteQuestion, useObjectOrgs,
} from './useProblematicQuestions';

interface Props {
  objectId:     string;
  questionId:   string | null;
  onClose:      () => void;
}

export function QuestionDetailSheet({ objectId, questionId, onClose }: Props) {
  const { data: issue, isLoading } = useQuestionDetail(objectId, questionId);
  const updateMutation = useUpdateQuestion(objectId);
  const deleteMutation = useDeleteQuestion(objectId);
  const { data: orgs = [] } = useObjectOrgs(objectId);

  const [editing, setEditing]         = useState(false);
  const [description, setDescription] = useState('');
  const [causes, setCauses]           = useState('');
  const [measuresTaken, setMeasuresTaken] = useState('');
  const [resolutionDate, setResolutionDate] = useState('');
  const [assigneeOrgId, setAssigneeOrgId]   = useState('');
  const [verifierOrgId, setVerifierOrgId]   = useState('');

  function startEdit() {
    if (!issue) return;
    setDescription(issue.description);
    setCauses(issue.causes ?? '');
    setMeasuresTaken(issue.measuresTaken ?? '');
    setResolutionDate(issue.resolutionDate ? issue.resolutionDate.slice(0, 10) : '');
    setAssigneeOrgId(issue.assigneeOrg?.id ?? '');
    setVerifierOrgId(issue.verifierOrg?.id ?? '');
    setEditing(true);
  }

  function saveEdit() {
    if (!issue) return;
    updateMutation.mutate(
      {
        id: issue.id,
        description,
        causes:         causes   || undefined,
        measuresTaken:  measuresTaken  || undefined,
        resolutionDate: resolutionDate ? new Date(resolutionDate).toISOString() : undefined,
        assigneeOrgId:  assigneeOrgId  || undefined,
        verifierOrgId:  verifierOrgId  || undefined,
      },
      { onSuccess: () => setEditing(false) }
    );
  }

  function closeIssue() {
    if (!issue) return;
    updateMutation.mutate(
      { id: issue.id, status: ProblemIssueStatus.CLOSED },
      { onSuccess: onClose }
    );
  }

  function handleDelete() {
    if (!issue || !confirm('Удалить вопрос?')) return;
    deleteMutation.mutate(issue.id, { onSuccess: onClose });
  }

  return (
    <Sheet open={!!questionId} onOpenChange={(open) => { if (!open) { setEditing(false); onClose(); } }}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {isLoading || !issue ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Загрузка...</div>
        ) : (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{QUESTION_TYPE_LABELS[issue.type]}</Badge>
                <Badge variant={issue.status === 'ACTIVE' ? 'outline' : 'secondary'}
                  className={issue.status === 'ACTIVE' ? 'text-yellow-600 border-yellow-400' : ''}>
                  {issue.status === 'ACTIVE' ? 'Актуальный' : 'Закрыт'}
                </Badge>
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 text-sm">
              {editing ? (
                <>
                  <div className="space-y-1">
                    <Label>Проблемный вопрос</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </div>
                  <div className="space-y-1">
                    <Label>Причины возникновения</Label>
                    <Textarea value={causes} onChange={(e) => setCauses(e.target.value)} rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Исполнитель</Label>
                      <Select value={assigneeOrgId || 'NONE'} onValueChange={(v) => setAssigneeOrgId(v === 'NONE' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">— не указан —</SelectItem>
                          {orgs.map((o) => (
                            <SelectItem key={o.organizationId} value={o.organizationId}>
                              {o.organization.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Проверяющий</Label>
                      <Select value={verifierOrgId || 'NONE'} onValueChange={(v) => setVerifierOrgId(v === 'NONE' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">— не указан —</SelectItem>
                          {orgs.map((o) => (
                            <SelectItem key={o.organizationId} value={o.organizationId}>
                              {o.organization.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Предпринятые меры</Label>
                    <Textarea value={measuresTaken} onChange={(e) => setMeasuresTaken(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label>Дата решения</Label>
                    <input type="date" value={resolutionDate} onChange={(e) => setResolutionDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Отмена</Button>
                  </div>
                </>
              ) : (
                <>
                  <Row label="Создан">{formatDate(issue.createdAt)}</Row>
                  <Row label="Автор">{issue.author.lastName} {issue.author.firstName}</Row>
                  <Row label="Проблемный вопрос"><span className="whitespace-pre-wrap">{issue.description}</span></Row>
                  {issue.causes      && <Row label="Причины"><span className="whitespace-pre-wrap">{issue.causes}</span></Row>}
                  {issue.assigneeOrg && <Row label="Исполнитель">{issue.assigneeOrg.name}</Row>}
                  {issue.verifierOrg && <Row label="Проверяющий">{issue.verifierOrg.name}</Row>}
                  {issue.measuresTaken && <Row label="Предпринятые меры"><span className="whitespace-pre-wrap">{issue.measuresTaken}</span></Row>}
                  {issue.resolutionDate && <Row label="Дата решения">{formatDate(issue.resolutionDate)}</Row>}

                  {issue.attachments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Файлы</p>
                      <ul className="space-y-1">
                        {issue.attachments.map((a) => (
                          <li key={a.id}>
                            <a
                              href={`/api/projects/${objectId}/questions/${issue.id}/attachments?attachmentId=${a.id}`}
                              target="_blank" rel="noreferrer"
                              className="text-primary underline text-xs"
                            >
                              {a.fileName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" onClick={startEdit}>Редактировать</Button>
                    {issue.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={closeIssue}
                        disabled={updateMutation.isPending}>
                        Закрыть вопрос
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={handleDelete}
                      disabled={deleteMutation.isPending}>
                      Удалить
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
