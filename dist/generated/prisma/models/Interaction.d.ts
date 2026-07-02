import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type InteractionModel = runtime.Types.Result.DefaultSelection<Prisma.$InteractionPayload>;
export type AggregateInteraction = {
    _count: InteractionCountAggregateOutputType | null;
    _min: InteractionMinAggregateOutputType | null;
    _max: InteractionMaxAggregateOutputType | null;
};
export type InteractionMinAggregateOutputType = {
    id: string | null;
    conversationId: string | null;
    direction: string | null;
    type: string | null;
    content: string | null;
    timestamp: Date | null;
};
export type InteractionMaxAggregateOutputType = {
    id: string | null;
    conversationId: string | null;
    direction: string | null;
    type: string | null;
    content: string | null;
    timestamp: Date | null;
};
export type InteractionCountAggregateOutputType = {
    id: number;
    conversationId: number;
    direction: number;
    type: number;
    content: number;
    timestamp: number;
    _all: number;
};
export type InteractionMinAggregateInputType = {
    id?: true;
    conversationId?: true;
    direction?: true;
    type?: true;
    content?: true;
    timestamp?: true;
};
export type InteractionMaxAggregateInputType = {
    id?: true;
    conversationId?: true;
    direction?: true;
    type?: true;
    content?: true;
    timestamp?: true;
};
export type InteractionCountAggregateInputType = {
    id?: true;
    conversationId?: true;
    direction?: true;
    type?: true;
    content?: true;
    timestamp?: true;
    _all?: true;
};
export type InteractionAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.InteractionWhereInput;
    orderBy?: Prisma.InteractionOrderByWithRelationInput | Prisma.InteractionOrderByWithRelationInput[];
    cursor?: Prisma.InteractionWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | InteractionCountAggregateInputType;
    _min?: InteractionMinAggregateInputType;
    _max?: InteractionMaxAggregateInputType;
};
export type GetInteractionAggregateType<T extends InteractionAggregateArgs> = {
    [P in keyof T & keyof AggregateInteraction]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateInteraction[P]> : Prisma.GetScalarType<T[P], AggregateInteraction[P]>;
};
export type InteractionGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.InteractionWhereInput;
    orderBy?: Prisma.InteractionOrderByWithAggregationInput | Prisma.InteractionOrderByWithAggregationInput[];
    by: Prisma.InteractionScalarFieldEnum[] | Prisma.InteractionScalarFieldEnum;
    having?: Prisma.InteractionScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: InteractionCountAggregateInputType | true;
    _min?: InteractionMinAggregateInputType;
    _max?: InteractionMaxAggregateInputType;
};
export type InteractionGroupByOutputType = {
    id: string;
    conversationId: string;
    direction: string;
    type: string;
    content: string;
    timestamp: Date;
    _count: InteractionCountAggregateOutputType | null;
    _min: InteractionMinAggregateOutputType | null;
    _max: InteractionMaxAggregateOutputType | null;
};
export type GetInteractionGroupByPayload<T extends InteractionGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<InteractionGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof InteractionGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], InteractionGroupByOutputType[P]> : Prisma.GetScalarType<T[P], InteractionGroupByOutputType[P]>;
}>>;
export type InteractionWhereInput = {
    AND?: Prisma.InteractionWhereInput | Prisma.InteractionWhereInput[];
    OR?: Prisma.InteractionWhereInput[];
    NOT?: Prisma.InteractionWhereInput | Prisma.InteractionWhereInput[];
    id?: Prisma.StringFilter<"Interaction"> | string;
    conversationId?: Prisma.StringFilter<"Interaction"> | string;
    direction?: Prisma.StringFilter<"Interaction"> | string;
    type?: Prisma.StringFilter<"Interaction"> | string;
    content?: Prisma.StringFilter<"Interaction"> | string;
    timestamp?: Prisma.DateTimeFilter<"Interaction"> | Date | string;
    conversation?: Prisma.XOR<Prisma.ConversationScalarRelationFilter, Prisma.ConversationWhereInput>;
};
export type InteractionOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    conversationId?: Prisma.SortOrder;
    direction?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    content?: Prisma.SortOrder;
    timestamp?: Prisma.SortOrder;
    conversation?: Prisma.ConversationOrderByWithRelationInput;
};
export type InteractionWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.InteractionWhereInput | Prisma.InteractionWhereInput[];
    OR?: Prisma.InteractionWhereInput[];
    NOT?: Prisma.InteractionWhereInput | Prisma.InteractionWhereInput[];
    conversationId?: Prisma.StringFilter<"Interaction"> | string;
    direction?: Prisma.StringFilter<"Interaction"> | string;
    type?: Prisma.StringFilter<"Interaction"> | string;
    content?: Prisma.StringFilter<"Interaction"> | string;
    timestamp?: Prisma.DateTimeFilter<"Interaction"> | Date | string;
    conversation?: Prisma.XOR<Prisma.ConversationScalarRelationFilter, Prisma.ConversationWhereInput>;
}, "id">;
export type InteractionOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    conversationId?: Prisma.SortOrder;
    direction?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    content?: Prisma.SortOrder;
    timestamp?: Prisma.SortOrder;
    _count?: Prisma.InteractionCountOrderByAggregateInput;
    _max?: Prisma.InteractionMaxOrderByAggregateInput;
    _min?: Prisma.InteractionMinOrderByAggregateInput;
};
export type InteractionScalarWhereWithAggregatesInput = {
    AND?: Prisma.InteractionScalarWhereWithAggregatesInput | Prisma.InteractionScalarWhereWithAggregatesInput[];
    OR?: Prisma.InteractionScalarWhereWithAggregatesInput[];
    NOT?: Prisma.InteractionScalarWhereWithAggregatesInput | Prisma.InteractionScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Interaction"> | string;
    conversationId?: Prisma.StringWithAggregatesFilter<"Interaction"> | string;
    direction?: Prisma.StringWithAggregatesFilter<"Interaction"> | string;
    type?: Prisma.StringWithAggregatesFilter<"Interaction"> | string;
    content?: Prisma.StringWithAggregatesFilter<"Interaction"> | string;
    timestamp?: Prisma.DateTimeWithAggregatesFilter<"Interaction"> | Date | string;
};
export type InteractionCreateInput = {
    id?: string;
    direction: string;
    type: string;
    content: string;
    timestamp?: Date | string;
    conversation: Prisma.ConversationCreateNestedOneWithoutInteractionsInput;
};
export type InteractionUncheckedCreateInput = {
    id?: string;
    conversationId: string;
    direction: string;
    type: string;
    content: string;
    timestamp?: Date | string;
};
export type InteractionUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    direction?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    content?: Prisma.StringFieldUpdateOperationsInput | string;
    timestamp?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    conversation?: Prisma.ConversationUpdateOneRequiredWithoutInteractionsNestedInput;
};
export type InteractionUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    conversationId?: Prisma.StringFieldUpdateOperationsInput | string;
    direction?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    content?: Prisma.StringFieldUpdateOperationsInput | string;
    timestamp?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type InteractionCreateManyInput = {
    id?: string;
    conversationId: string;
    direction: string;
    type: string;
    content: string;
    timestamp?: Date | string;
};
export type InteractionUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    direction?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    content?: Prisma.StringFieldUpdateOperationsInput | string;
    timestamp?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type InteractionUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    conversationId?: Prisma.StringFieldUpdateOperationsInput | string;
    direction?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    content?: Prisma.StringFieldUpdateOperationsInput | string;
    timestamp?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type InteractionListRelationFilter = {
    every?: Prisma.InteractionWhereInput;
    some?: Prisma.InteractionWhereInput;
    none?: Prisma.InteractionWhereInput;
};
export type InteractionOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type InteractionCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    conversationId?: Prisma.SortOrder;
    direction?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    content?: Prisma.SortOrder;
    timestamp?: Prisma.SortOrder;
};
export type InteractionMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    conversationId?: Prisma.SortOrder;
    direction?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    content?: Prisma.SortOrder;
    timestamp?: Prisma.SortOrder;
};
export type InteractionMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    conversationId?: Prisma.SortOrder;
    direction?: Prisma.SortOrder;
    type?: Prisma.SortOrder;
    content?: Prisma.SortOrder;
    timestamp?: Prisma.SortOrder;
};
export type InteractionCreateNestedManyWithoutConversationInput = {
    create?: Prisma.XOR<Prisma.InteractionCreateWithoutConversationInput, Prisma.InteractionUncheckedCreateWithoutConversationInput> | Prisma.InteractionCreateWithoutConversationInput[] | Prisma.InteractionUncheckedCreateWithoutConversationInput[];
    connectOrCreate?: Prisma.InteractionCreateOrConnectWithoutConversationInput | Prisma.InteractionCreateOrConnectWithoutConversationInput[];
    createMany?: Prisma.InteractionCreateManyConversationInputEnvelope;
    connect?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
};
export type InteractionUncheckedCreateNestedManyWithoutConversationInput = {
    create?: Prisma.XOR<Prisma.InteractionCreateWithoutConversationInput, Prisma.InteractionUncheckedCreateWithoutConversationInput> | Prisma.InteractionCreateWithoutConversationInput[] | Prisma.InteractionUncheckedCreateWithoutConversationInput[];
    connectOrCreate?: Prisma.InteractionCreateOrConnectWithoutConversationInput | Prisma.InteractionCreateOrConnectWithoutConversationInput[];
    createMany?: Prisma.InteractionCreateManyConversationInputEnvelope;
    connect?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
};
export type InteractionUpdateManyWithoutConversationNestedInput = {
    create?: Prisma.XOR<Prisma.InteractionCreateWithoutConversationInput, Prisma.InteractionUncheckedCreateWithoutConversationInput> | Prisma.InteractionCreateWithoutConversationInput[] | Prisma.InteractionUncheckedCreateWithoutConversationInput[];
    connectOrCreate?: Prisma.InteractionCreateOrConnectWithoutConversationInput | Prisma.InteractionCreateOrConnectWithoutConversationInput[];
    upsert?: Prisma.InteractionUpsertWithWhereUniqueWithoutConversationInput | Prisma.InteractionUpsertWithWhereUniqueWithoutConversationInput[];
    createMany?: Prisma.InteractionCreateManyConversationInputEnvelope;
    set?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    disconnect?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    delete?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    connect?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    update?: Prisma.InteractionUpdateWithWhereUniqueWithoutConversationInput | Prisma.InteractionUpdateWithWhereUniqueWithoutConversationInput[];
    updateMany?: Prisma.InteractionUpdateManyWithWhereWithoutConversationInput | Prisma.InteractionUpdateManyWithWhereWithoutConversationInput[];
    deleteMany?: Prisma.InteractionScalarWhereInput | Prisma.InteractionScalarWhereInput[];
};
export type InteractionUncheckedUpdateManyWithoutConversationNestedInput = {
    create?: Prisma.XOR<Prisma.InteractionCreateWithoutConversationInput, Prisma.InteractionUncheckedCreateWithoutConversationInput> | Prisma.InteractionCreateWithoutConversationInput[] | Prisma.InteractionUncheckedCreateWithoutConversationInput[];
    connectOrCreate?: Prisma.InteractionCreateOrConnectWithoutConversationInput | Prisma.InteractionCreateOrConnectWithoutConversationInput[];
    upsert?: Prisma.InteractionUpsertWithWhereUniqueWithoutConversationInput | Prisma.InteractionUpsertWithWhereUniqueWithoutConversationInput[];
    createMany?: Prisma.InteractionCreateManyConversationInputEnvelope;
    set?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    disconnect?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    delete?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    connect?: Prisma.InteractionWhereUniqueInput | Prisma.InteractionWhereUniqueInput[];
    update?: Prisma.InteractionUpdateWithWhereUniqueWithoutConversationInput | Prisma.InteractionUpdateWithWhereUniqueWithoutConversationInput[];
    updateMany?: Prisma.InteractionUpdateManyWithWhereWithoutConversationInput | Prisma.InteractionUpdateManyWithWhereWithoutConversationInput[];
    deleteMany?: Prisma.InteractionScalarWhereInput | Prisma.InteractionScalarWhereInput[];
};
export type InteractionCreateWithoutConversationInput = {
    id?: string;
    direction: string;
    type: string;
    content: string;
    timestamp?: Date | string;
};
export type InteractionUncheckedCreateWithoutConversationInput = {
    id?: string;
    direction: string;
    type: string;
    content: string;
    timestamp?: Date | string;
};
export type InteractionCreateOrConnectWithoutConversationInput = {
    where: Prisma.InteractionWhereUniqueInput;
    create: Prisma.XOR<Prisma.InteractionCreateWithoutConversationInput, Prisma.InteractionUncheckedCreateWithoutConversationInput>;
};
export type InteractionCreateManyConversationInputEnvelope = {
    data: Prisma.InteractionCreateManyConversationInput | Prisma.InteractionCreateManyConversationInput[];
    skipDuplicates?: boolean;
};
export type InteractionUpsertWithWhereUniqueWithoutConversationInput = {
    where: Prisma.InteractionWhereUniqueInput;
    update: Prisma.XOR<Prisma.InteractionUpdateWithoutConversationInput, Prisma.InteractionUncheckedUpdateWithoutConversationInput>;
    create: Prisma.XOR<Prisma.InteractionCreateWithoutConversationInput, Prisma.InteractionUncheckedCreateWithoutConversationInput>;
};
export type InteractionUpdateWithWhereUniqueWithoutConversationInput = {
    where: Prisma.InteractionWhereUniqueInput;
    data: Prisma.XOR<Prisma.InteractionUpdateWithoutConversationInput, Prisma.InteractionUncheckedUpdateWithoutConversationInput>;
};
export type InteractionUpdateManyWithWhereWithoutConversationInput = {
    where: Prisma.InteractionScalarWhereInput;
    data: Prisma.XOR<Prisma.InteractionUpdateManyMutationInput, Prisma.InteractionUncheckedUpdateManyWithoutConversationInput>;
};
export type InteractionScalarWhereInput = {
    AND?: Prisma.InteractionScalarWhereInput | Prisma.InteractionScalarWhereInput[];
    OR?: Prisma.InteractionScalarWhereInput[];
    NOT?: Prisma.InteractionScalarWhereInput | Prisma.InteractionScalarWhereInput[];
    id?: Prisma.StringFilter<"Interaction"> | string;
    conversationId?: Prisma.StringFilter<"Interaction"> | string;
    direction?: Prisma.StringFilter<"Interaction"> | string;
    type?: Prisma.StringFilter<"Interaction"> | string;
    content?: Prisma.StringFilter<"Interaction"> | string;
    timestamp?: Prisma.DateTimeFilter<"Interaction"> | Date | string;
};
export type InteractionCreateManyConversationInput = {
    id?: string;
    direction: string;
    type: string;
    content: string;
    timestamp?: Date | string;
};
export type InteractionUpdateWithoutConversationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    direction?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    content?: Prisma.StringFieldUpdateOperationsInput | string;
    timestamp?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type InteractionUncheckedUpdateWithoutConversationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    direction?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    content?: Prisma.StringFieldUpdateOperationsInput | string;
    timestamp?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type InteractionUncheckedUpdateManyWithoutConversationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    direction?: Prisma.StringFieldUpdateOperationsInput | string;
    type?: Prisma.StringFieldUpdateOperationsInput | string;
    content?: Prisma.StringFieldUpdateOperationsInput | string;
    timestamp?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type InteractionSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    conversationId?: boolean;
    direction?: boolean;
    type?: boolean;
    content?: boolean;
    timestamp?: boolean;
    conversation?: boolean | Prisma.ConversationDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["interaction"]>;
export type InteractionSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    conversationId?: boolean;
    direction?: boolean;
    type?: boolean;
    content?: boolean;
    timestamp?: boolean;
    conversation?: boolean | Prisma.ConversationDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["interaction"]>;
export type InteractionSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    conversationId?: boolean;
    direction?: boolean;
    type?: boolean;
    content?: boolean;
    timestamp?: boolean;
    conversation?: boolean | Prisma.ConversationDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["interaction"]>;
export type InteractionSelectScalar = {
    id?: boolean;
    conversationId?: boolean;
    direction?: boolean;
    type?: boolean;
    content?: boolean;
    timestamp?: boolean;
};
export type InteractionOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "conversationId" | "direction" | "type" | "content" | "timestamp", ExtArgs["result"]["interaction"]>;
export type InteractionInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    conversation?: boolean | Prisma.ConversationDefaultArgs<ExtArgs>;
};
export type InteractionIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    conversation?: boolean | Prisma.ConversationDefaultArgs<ExtArgs>;
};
export type InteractionIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    conversation?: boolean | Prisma.ConversationDefaultArgs<ExtArgs>;
};
export type $InteractionPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Interaction";
    objects: {
        conversation: Prisma.$ConversationPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        conversationId: string;
        direction: string;
        type: string;
        content: string;
        timestamp: Date;
    }, ExtArgs["result"]["interaction"]>;
    composites: {};
};
export type InteractionGetPayload<S extends boolean | null | undefined | InteractionDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$InteractionPayload, S>;
export type InteractionCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<InteractionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: InteractionCountAggregateInputType | true;
};
export interface InteractionDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Interaction'];
        meta: {
            name: 'Interaction';
        };
    };
    findUnique<T extends InteractionFindUniqueArgs>(args: Prisma.SelectSubset<T, InteractionFindUniqueArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends InteractionFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, InteractionFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends InteractionFindFirstArgs>(args?: Prisma.SelectSubset<T, InteractionFindFirstArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends InteractionFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, InteractionFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends InteractionFindManyArgs>(args?: Prisma.SelectSubset<T, InteractionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends InteractionCreateArgs>(args: Prisma.SelectSubset<T, InteractionCreateArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends InteractionCreateManyArgs>(args?: Prisma.SelectSubset<T, InteractionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends InteractionCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, InteractionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends InteractionDeleteArgs>(args: Prisma.SelectSubset<T, InteractionDeleteArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends InteractionUpdateArgs>(args: Prisma.SelectSubset<T, InteractionUpdateArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends InteractionDeleteManyArgs>(args?: Prisma.SelectSubset<T, InteractionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends InteractionUpdateManyArgs>(args: Prisma.SelectSubset<T, InteractionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends InteractionUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, InteractionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends InteractionUpsertArgs>(args: Prisma.SelectSubset<T, InteractionUpsertArgs<ExtArgs>>): Prisma.Prisma__InteractionClient<runtime.Types.Result.GetResult<Prisma.$InteractionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends InteractionCountArgs>(args?: Prisma.Subset<T, InteractionCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], InteractionCountAggregateOutputType> : number>;
    aggregate<T extends InteractionAggregateArgs>(args: Prisma.Subset<T, InteractionAggregateArgs>): Prisma.PrismaPromise<GetInteractionAggregateType<T>>;
    groupBy<T extends InteractionGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: InteractionGroupByArgs['orderBy'];
    } : {
        orderBy?: InteractionGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, InteractionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetInteractionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: InteractionFieldRefs;
}
export interface Prisma__InteractionClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    conversation<T extends Prisma.ConversationDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.ConversationDefaultArgs<ExtArgs>>): Prisma.Prisma__ConversationClient<runtime.Types.Result.GetResult<Prisma.$ConversationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface InteractionFieldRefs {
    readonly id: Prisma.FieldRef<"Interaction", 'String'>;
    readonly conversationId: Prisma.FieldRef<"Interaction", 'String'>;
    readonly direction: Prisma.FieldRef<"Interaction", 'String'>;
    readonly type: Prisma.FieldRef<"Interaction", 'String'>;
    readonly content: Prisma.FieldRef<"Interaction", 'String'>;
    readonly timestamp: Prisma.FieldRef<"Interaction", 'DateTime'>;
}
export type InteractionFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    where: Prisma.InteractionWhereUniqueInput;
};
export type InteractionFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    where: Prisma.InteractionWhereUniqueInput;
};
export type InteractionFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    where?: Prisma.InteractionWhereInput;
    orderBy?: Prisma.InteractionOrderByWithRelationInput | Prisma.InteractionOrderByWithRelationInput[];
    cursor?: Prisma.InteractionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.InteractionScalarFieldEnum | Prisma.InteractionScalarFieldEnum[];
};
export type InteractionFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    where?: Prisma.InteractionWhereInput;
    orderBy?: Prisma.InteractionOrderByWithRelationInput | Prisma.InteractionOrderByWithRelationInput[];
    cursor?: Prisma.InteractionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.InteractionScalarFieldEnum | Prisma.InteractionScalarFieldEnum[];
};
export type InteractionFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    where?: Prisma.InteractionWhereInput;
    orderBy?: Prisma.InteractionOrderByWithRelationInput | Prisma.InteractionOrderByWithRelationInput[];
    cursor?: Prisma.InteractionWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.InteractionScalarFieldEnum | Prisma.InteractionScalarFieldEnum[];
};
export type InteractionCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.InteractionCreateInput, Prisma.InteractionUncheckedCreateInput>;
};
export type InteractionCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.InteractionCreateManyInput | Prisma.InteractionCreateManyInput[];
    skipDuplicates?: boolean;
};
export type InteractionCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    data: Prisma.InteractionCreateManyInput | Prisma.InteractionCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.InteractionIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type InteractionUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.InteractionUpdateInput, Prisma.InteractionUncheckedUpdateInput>;
    where: Prisma.InteractionWhereUniqueInput;
};
export type InteractionUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.InteractionUpdateManyMutationInput, Prisma.InteractionUncheckedUpdateManyInput>;
    where?: Prisma.InteractionWhereInput;
    limit?: number;
};
export type InteractionUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.InteractionUpdateManyMutationInput, Prisma.InteractionUncheckedUpdateManyInput>;
    where?: Prisma.InteractionWhereInput;
    limit?: number;
    include?: Prisma.InteractionIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type InteractionUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    where: Prisma.InteractionWhereUniqueInput;
    create: Prisma.XOR<Prisma.InteractionCreateInput, Prisma.InteractionUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.InteractionUpdateInput, Prisma.InteractionUncheckedUpdateInput>;
};
export type InteractionDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
    where: Prisma.InteractionWhereUniqueInput;
};
export type InteractionDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.InteractionWhereInput;
    limit?: number;
};
export type InteractionDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.InteractionSelect<ExtArgs> | null;
    omit?: Prisma.InteractionOmit<ExtArgs> | null;
    include?: Prisma.InteractionInclude<ExtArgs> | null;
};
